class UserManager {
    constructor() {
        this.users = {};
        this.tokens = {};
        this.sessions = {};
        this.permissions = {};
        this.roles = {};
        this.auditLog = [];
        this.pendingRequests = {};
        this.emailQueue = [];
        this.resetTokens = {};
        this.inviteCodes = {};
    }

    registerUser(username, password, email, role = "user") {
        const user = {
            username: username,
            email: email,
            role: role,
            passwordHash: this._hashPassword(password),
            id: `user_${Object.keys(this.users).length + 1}`,
        };
        this.users[username] = user;
        this.permissions[username] = this.roles[role] || ["read"];
        this.auditLog.push(`User registered: ${username}`);
        return user;
    }

    login(username, password) {
        const user = this.users[username];
        if (!user) {
            this.auditLog.push(`Login failed: ${username}`);
            return null;
        }
        if (!this._verifyPassword(password, user.passwordHash)) {
            this.auditLog.push(`Login failed: ${username}`);
            return null;
        }

        const sessionToken = this._generateToken();
        this.sessions[sessionToken] = {
            user: username,
            expires: Date.now() + 3600000,
        };
        this.tokens[username] = sessionToken;
        this.auditLog.push(`Login successful: ${username}`);
        return sessionToken;
    }

    logout(sessionToken) {
        if (sessionToken in this.sessions) {
            const username = this.sessions[sessionToken].user;
            delete this.sessions[sessionToken];
            if (username in this.tokens) {
                delete this.tokens[username];
            }
            this.auditLog.push(`User logged out: ${username}`);
        }
    }

    checkPermission(username, permission) {
        const perms = this.permissions[username] || [];
        return perms.includes(permission);
    }

    resetPasswordRequest(username) {
        const user = this.users[username];
        if (!user) {
            return false;
        }
        const resetToken = this._generateToken();
        this.resetTokens[resetToken] = username;
        this.emailQueue.push({
            to: user.email,
            type: "password_reset",
            token: resetToken,
        });
        return true;
    }

    confirmReset(token, newPassword) {
        if (!(token in this.resetTokens)) {
            return false;
        }
        const username = this.resetTokens[token];
        const user = this.users[username];
        if (user) {
            user.passwordHash = this._hashPassword(newPassword);
            delete this.resetTokens[token];
            return true;
        }
        return false;
    }

    inviteUser(inviter, email, role) {
        const inviteCode = this._generateToken();
        this.inviteCodes[inviteCode] = {
            inviter: inviter,
            email: email,
            role: role,
        };
        this.emailQueue.push({
            to: email,
            type: "invite",
            code: inviteCode,
        });
        return inviteCode;
    }

    acceptInvite(code, username, password) {
        if (!(code in this.inviteCodes)) {
            return null;
        }
        const invite = this.inviteCodes[code];
        const user = {
            username: username,
            email: invite.email,
            role: invite.role,
            passwordHash: this._hashPassword(password),
            id: `user_${Object.keys(this.users).length + 1}`,
        };
        this.users[username] = user;
        this.permissions[username] = this.roles[invite.role] || ["read"];
        delete this.inviteCodes[code];
        return user;
    }

    _hashPassword(password) {
        return `hashed_${password}_salt`;
    }

    _verifyPassword(password, hash) {
        return hash === `hashed_${password}_salt`;
    }

    _generateToken() {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
}
