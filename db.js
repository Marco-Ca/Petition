const spicedPg  = require("spiced-pg"),
    bcrypt      = require('bcryptjs'),
    dbUrl = process.env.DATABASE_URL || 'postgres:postgres:postgres@localhost:5432/petition';
const db = spicedPg(dbUrl);

module.exports.toRegister = function toRegister(first, last, email, password) {
    return db.query(
        `INSERT INTO users (first, last, email, password)
        VALUES ($1, $2, $3, $4) RETURNING id, first, last, email, password`,
        [first || null, last || null, email || null, password || null]
    );
};

module.exports.toAddInfo = function toAddInfo(age, city, homepage, user_id) {
    return db.query(
        `INSERT INTO user_profiles (age, city, homepage, user_id)
        VALUES ($1, $2, $3, $4) RETURNING age, city, homepage, user_id`,
        [age || null, city || null, homepage || null, user_id || null]
    );
};


module.exports.signPetition = function signPetition(sig, user_id) {
    return db.query(
        `INSERT INTO signatures (signature, user_id)
		VALUES ($1, $2) RETURNING id`,
        [sig || null, user_id || null]
    );
};

module.exports.getSigners = function getSigners() {
    return db.query(`SELECT first, last FROM users`);
};

module.exports.getSigners2 = function getSigners2() {
    return db.query(`
        SELECT *
        FROM users
        LEFT JOIN user_profiles
        ON users.id = user_profiles.user_id
        `);
};

module.exports.getProfile = function getProfile(id) {
    return db.query(`
        SELECT *
        FROM users
        LEFT JOIN user_profiles
        ON users.id = user_profiles.user_id
        WHERE user_id = $1
        `, [id]);
};

module.exports.updateUser = function updateUser(first, last, email, password, user_id) {
    return db.query (`
        UPDATE users
        SET first = $1, last = $2, email = $3, password = $4
        WHERE id = $5
        `, [first, last, email, password, user_id]);
};

module.exports.updateUserOutPassword = function updateUser(first, last, email,  user_id) {
    return db.query (`
        UPDATE users
        SET first = $1, last = $2, email = $3
        WHERE id = $4
        `, [first, last, email, user_id]);
};

module.exports.updateUserProfile = function updateUserProfile(age, city, homepage, user_id) {
    return db.query(`
            UPDATE user_profiles
            SET age = $1, city = $2, homepage = $3
            WHERE id = $4
            `, [age, city, homepage, user_id]);
};

module.exports.getUserByEmail = function getUserByEmail(email) {
    return db.query(`
        SELECT * FROM users WHERE email = $1`, [email]);
};

module.exports.getUserByEmail2 = function getUserByEmail2(email) {
    return db.query(`
        SELECT users.id as user_id, signatures.id as sig_id, signatures.user_id as sig_user, users.first, users.last
        FROM users
        LEFT JOIN signatures
        ON signatures.user_id = users.id
        WHERE email = $1
        `, [email]
    );
};

module.exports.getSigIdByUserId = function getSigIdByUserId(id) {
    return db.query(`SELECT id FROM signatures WHERE user_id = $1`,
        [id]
    );
};

module.exports.getSignersByCity = function getSignersByCity(city) {
    return db.query(`
        SELECT first, last
        FROM users
        LEFT JOIN user_profiles
        ON users.id = user_profiles.user_id
        WHERE LOWER(city) = LOWER($1)
        `, [city]
    );
};

module.exports.sigCount = function sigCount() {
    return db.query(`SELECT COUNT(*) FROM signatures`);
};

module.exports.getSignatureById = function getSignatureById(sigId) {
    return db.query(`SELECT * FROM signatures WHERE user_id = $1`, [sigId]);
};

module.exports.deleteSig = function deleteSig(userId) {
    return db.query(
        `DELETE FROM signatures
        WHERE user_id = $1`,
        [userId]
    );
};

module.exports.hashPassword = function hashPassword(plainTextPassword) {
    return new Promise(function(resolve, reject) {
        bcrypt.genSalt(function(err, salt) {
            if (err) {
                return reject(err);
            }
            bcrypt.hash(plainTextPassword, salt, function(err, hash) {
                if (err) {
                    return reject(err);
                }
                return resolve(hash);
            });
        });
    });
};

module.exports.checkPassword = function checkPassword(textEnteredInLoginForm, hashedPasswordFromDatabase) {
    return new Promise(function(resolve, reject) {
        bcrypt.compare(textEnteredInLoginForm, hashedPasswordFromDatabase, function(err, doesMatch) {
            if (err) {
                reject(err);
            } else {
                resolve(doesMatch);
            }
        });
    });
};
