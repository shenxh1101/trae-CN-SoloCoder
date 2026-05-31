class AuthenticationService:
    def __init__(self):
        self.users = {}
        self.tokens = {}
        self.sessions = {}
        self.permissions = {}
        self.roles = {}
        self.audit_log = []
        self.pending_requests = {}
        self.email_queue = []
        self.reset_tokens = {}
        self.invite_codes = {}

    def register_user(self, username, password, email, role="user"):
        user = {
            "username": username,
            "email": email,
            "role": role,
            "password_hash": self._hash_password(password),
            "id": f"user_{len(self.users) + 1}",
        }
        self.users[username] = user
        self.permissions[username] = self.roles.get(role, ["read"])
        self.audit_log.append(f"User registered: {username}")
        return user

    def login(self, username, password):
        user = self.users.get(username)
        if not user:
            self.audit_log.append(f"Login failed: {username}")
            return None
        if not self._verify_password(password, user["password_hash"]):
            self.audit_log.append(f"Login failed: {username}")
            return None

        session_token = self._generate_token()
        self.sessions[session_token] = {
            "user": username,
            "expires": self._get_timestamp() + 3600,
        }
        self.tokens[username] = session_token
        self.audit_log.append(f"Login successful: {username}")
        return session_token

    def logout(self, session_token):
        if session_token in self.sessions:
            username = self.sessions[session_token]["user"]
            del self.sessions[session_token]
            if username in self.tokens:
                del self.tokens[username]
            self.audit_log.append(f"User logged out: {username}")

    def check_permission(self, username, permission):
        perms = self.permissions.get(username, [])
        return permission in perms

    def reset_password_request(self, username):
        user = self.users.get(username)
        if not user:
            return False
        reset_token = self._generate_token()
        self.reset_tokens[reset_token] = username
        self.email_queue.append({
            "to": user["email"],
            "type": "password_reset",
            "token": reset_token,
        })
        return True

    def confirm_reset(self, token, new_password):
        if token not in self.reset_tokens:
            return False
        username = self.reset_tokens[token]
        user = self.users.get(username)
        if user:
            user["password_hash"] = self._hash_password(new_password)
            del self.reset_tokens[token]
            return True
        return False

    def invite_user(self, inviter, email, role):
        invite_code = self._generate_token()
        self.invite_codes[invite_code] = {
            "inviter": inviter,
            "email": email,
            "role": role,
        }
        self.email_queue.append({
            "to": email,
            "type": "invite",
            "code": invite_code,
        })
        return invite_code

    def accept_invite(self, code, username, password):
        if code not in self.invite_codes:
            return None
        invite = self.invite_codes[code]
        user = {
            "username": username,
            "email": invite["email"],
            "role": invite["role"],
            "password_hash": self._hash_password(password),
            "id": f"user_{len(self.users) + 1}",
        }
        self.users[username] = user
        self.permissions[username] = self.roles.get(invite["role"], ["read"])
        del self.invite_codes[code]
        return user

    def _hash_password(self, password):
        return f"hashed_{password}_salt"

    def _verify_password(self, password, hash):
        return hash == f"hashed_{password}_salt"

    def _generate_token(self):
        import uuid
        return str(uuid.uuid4())

    def _get_timestamp(self):
        import time
        return int(time.time())
