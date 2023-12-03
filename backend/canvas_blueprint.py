from flask import Blueprint, jsonify, redirect, request, session
import jwt
import requests
import os

canvas_blueprint = Blueprint('canvas', __name__)

# LTI Launch Steps. 
# Reference: https://canvas.instructure.com/doc/api/file.lti_dev_key_config.html
# ****************************** STEP 1 START ******************************
@canvas_blueprint.route('/oidc', methods=['POST'])
def step_1():
    """
    Step 1 of Canvas LTI launch.
    Ensure request comes from Canvas itself, by checking against filled form fields.
    If they are all present, proceed to the following step.
    """
    iss = request.form.get('iss')
    lti_message_hint = request.form.get('lti_message_hint')
    target_link_uri = request.form.get('target_link_uri')
    login_hint = request.form.get('login_hint')

    # Check if required data is present. If it is, go on to step 2.
    if not all([iss, lti_message_hint, target_link_uri]):
        return jsonify({'error': 'Missing required data'}), 400
    else:
        return step_2(iss, lti_message_hint, target_link_uri, login_hint)
# ****************************** STEP 1 END ******************************
    
# ****************************** STEP 2 START ******************************
def step_2(iss, lti_message_hint, target_link_uri, login_hint):
    """
    Step 2 of Canvas LTI launch.
    If step 1 was successful, provide preshared or otherwise required data for the next step in the oauth flow.
    Below variables are required to construct a valid request to the redirect.
    - scope
    - response_type
    - client ID (stored in environment variable)
    - redirect uri (preshared with LMS provider)
    - state (optional, 12345 for testing)
    - response_mode
    - nonce (must be defined, does not matter which data was used)
    - prompt
    """
    scope = "openid"
    response_type = "id_token"
    client_id = os.environ["CLIENT_ID_COCOBOT"] or None
    redirect_uri = "https://192.168.100.30:5000/callback"
    state = "12345"  # TODO: check if useful.
    response_mode = "form_post"
    nonce = "testing_nonce"
    prompt = "none"

    # Construct the redirect URL
    redirect_url = (
        f"https://sso.test.canvaslms.com/api/lti/authorize_redirect?"
        f"iss={iss}&lti_message_hint={lti_message_hint}&target_link_uri={target_link_uri}"
        f"&scope={scope}&response_type={response_type}&client_id={client_id}"
        f"&redirect_uri={redirect_uri}&state={state}&response_mode={response_mode}"
        f"&nonce={nonce}&prompt={prompt}"
        f"&login_hint={login_hint}"
    )

    # Perform the redirect upon construction of the url.
    return redirect(redirect_url)
# ****************************** STEP 2 END ******************************

# ****************************** STEP 3 START ******************************

@canvas_blueprint.route('/callback', methods=['GET', 'POST'])
def redirect_uri():
    """
    Step 3 and 4 of Canvas LTI launch.
    If step 2 was successful, Canvas will ask for the key in the public jwks to sign the jwt token.
    They are pulled from the public JWK enpoint provided by Canvas. One of these keys was used initially.
    If the token was deemed valid, it will set the session variables for the backend to be used, after which
    a real redirect to the frontend can be processed.
    """
    data = request.form

    # Data for verification:
    id_token = data['id_token']
    is_valid, result = verify_jwt_with_jwks(id_token)
# ****************************** STEP 3 END ******************************
# ****************************** STEP 4 START ******************************
    if is_valid:
        print(f"Valid!: {result}")
        # Set the session variables for this user to be used throughout the backend.
        session['user_id'] = result['https://purl.imsglobal.org/spec/lti/claim/lti1p1']['user_id']
        session['course_name'] = result['https://purl.imsglobal.org/spec/lti/claim/resource_link']['title']
        session['course_info'] = result['https://purl.imsglobal.org/spec/lti/claim/context']

        # Construct the redirect URL
        redirect_url = (
            f"https://192.168.100.30:3000/"
        )
        # Perform the redirect to the cocobot frontend.
        return redirect(redirect_url)
    else:
        return f"Error: {result}"
# ****************************** STEP 4 END ******************************
@canvas_blueprint.route('/jwks', methods=['GET'])
def public_jwk():
    """
    Step 3 of Canvas LTI launch.
    If step 2 was successful, Canvas will ask for the key in the public jwks to sign the jwt token.
    They are pulled from the public JWK enpoint provided by Canvas. One of these keys was used initially.
    """
    response = requests.get("https://sso.test.canvaslms.com/api/lti/security/jwks")
    response.raise_for_status()
    return response.json()

def get_jwk_from_kid(jwks, kid):
    """
    Part of the function 'public_jwk' (step 3)
    """
    for key in jwks['keys']:
        if key['kid'] == kid:
            return key
    return None

def verify_jwt_with_jwks(id_token):
    """
    Performs the actual verification of the JWT using the list of public Canvas JWK. One of these JWK was used
    originally and should now also be used to authenticate the JWT. If none of the keys work, fail the oauth flow.
    Otherwise, proceeds to step 4.
    """
    # Fetch JWKS
    jwks = public_jwk()

    # Decode JWT header to get the key ID (kid)
    header = jwt.get_unverified_header(id_token)
    kid = header.get('kid')
    expected_audience = os.environ["CLIENT_ID_COCOBOT"]
    client_id = os.environ["CLIENT_ID_COCOBOT"]

    if not kid:
        raise ValueError('JWT header does not contain a "kid" field')

    # Find the JWK based on the key ID
    jwk = get_jwk_from_kid(jwks, kid)

    if not jwk:
        raise ValueError(f'JWK with key ID "{kid}" not found in JWKS')

    # Build the public key from JWK
    public_key = jwt.algorithms.RSAAlgorithm.from_jwk(jwk)

    # Verify the JWT
    try:
        decoded_token = jwt.decode(id_token, public_key, algorithms=['RS256'], audience=expected_audience)
        # 1) Tool must validate signature:
        # 2) Issuer must be valid (intrinsic)
        # 3) Audience claim must be checked (audience=expected_audience)
        # 4) If multiple audiences, verify azp is present (not necessary, single audience)
        # 5) azp should be authorized if present:
        if 'azp' in decoded_token:
            if not client_id in decoded_token['azp']:
                return False, "Authorized party (azp) is present but invalid"

        # 6) Algorithm should be RS256 or custom defined (it is RS256, see call jwt.decode)
        # 7) Current time must be before expiration time of token (intrinsic)
        # 8) iat checking omitted for simplicity.
        # 9) The 'nonce' claim must be checked/must be present.
        if 'nonce' not in decoded_token:
            return False, "Nonce not present (5.1.3 -> 9)"

        return True, decoded_token
    except jwt.ExpiredSignatureError:
        return False, 'Token has expired'
    except jwt.InvalidIssuerError:
        return False, 'Invalid issuer'
    except jwt.InvalidTokenError as e:
        return False, f'Invalid token: {e}'


# ****************************** OTHER ******************************
@canvas_blueprint.route('/canvas/information', methods=['GET'])
def return_course_info():
    """
    Once a full oauth flow is performed, the course_info session variable is set and available to return information
    about the course and its user.
    """

    if 'course_info' in session:
        return session['course_info']
    else:
        return {"title" : "No Canvas connection", "label" : "Unknown"}


# TODO: omit?
@canvas_blueprint.route('/', methods=['GET', 'POST'])
def target_link_uri():
    # data = request.form
    # print(data)
    return "Redundant"
