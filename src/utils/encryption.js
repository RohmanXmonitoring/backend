const crypto = require('crypto');
const bcrypt = require('bcryptjs');

class Encryption {
  static async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  static async comparePassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
  }

  static generateRandomString(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  static generateRandomNumber(length = 6) {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static generateOTP(length = 6) {
    return this.generateRandomNumber(length).toString().padStart(length, '0');
  }

  static generateUUID() {
    return crypto.randomUUID();
  }

  static generateApiKey() {
    return `api_${this.generateRandomString(32)}`;
  }

  static generateLicenseKey() {
    const segments = [];
    for (let i = 0; i < 5; i++) {
      segments.push(this.generateRandomString(4).toUpperCase());
    }
    return segments.join('-');
  }

  static generatePin() {
    return this.generateRandomString(6).toUpperCase();
  }

  static encrypt(text, key) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  static decrypt(text, key) {
    try {
      const [iv, encrypted] = text.split(':');
      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        Buffer.from(key),
        Buffer.from(iv, 'hex')
      );
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      return null;
    }
  }

  static generateHash(data, algorithm = 'sha256') {
    return crypto.createHash(algorithm).update(data).digest('hex');
  }

  static generateHMAC(data, secret, algorithm = 'sha256') {
    return crypto.createHmac(algorithm, secret).update(data).digest('hex');
  }

  static generateKeyPair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });
    return { publicKey, privateKey };
  }

  static signMessage(message, privateKey) {
    const sign = crypto.createSign('SHA256');
    sign.update(message);
    sign.end();
    return sign.sign(privateKey, 'hex');
  }

  static verifyMessage(message, signature, publicKey) {
    const verify = crypto.createVerify('SHA256');
    verify.update(message);
    verify.end();
    return verify.verify(publicKey, signature, 'hex');
  }
}

module.exports = Encryption;
