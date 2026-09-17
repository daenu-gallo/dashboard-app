#!/usr/bin/env node

import crypto from 'crypto';

// 🔧 Hilfsfunktion für Base64URL-Codierung
function base64url(buf) {
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

// 🔐 Erstellt einen JWT mit dem gegebenen Payload und Secret
function createJWT(payload, secret) {
  const header = { typ: 'JWT', alg: 'HS256' };
  const segments = [
    base64url(Buffer.from(JSON.stringify(header))),
    base64url(Buffer.from(JSON.stringify(payload))),
  ];
  const signature = crypto.createHmac('sha256', secret).update(segments.join('.')).digest();
  segments.push(base64url(signature));
  return segments.join('.');
}

// ✅ Überprüft einen bestehenden JWT
function verifyJWT(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  
  const headerAndPayload = parts.slice(0, 2).join('.');
  const signature = crypto.createHmac('sha256', secret).update(headerAndPayload).digest();
  const expectedSignature = base64url(signature);
  
  return parts[2] === expectedSignature;
}

// 🚀 Hauptfunktion
function main() {
  const args = process.argv.slice(2);
  
  // 🔍 Überprüfungsmodus
  if (args[0] === '--verify') {
    if (args.length < 3) {
      console.error('❌ Fehler: Bitte geben Sie Token und Secret an.');
      console.error('💡 Verwendung: node generate-supabase-keys.mjs --verify <jwt> <secret>');
      process.exit(1);
    }
    
    const token = args[1];
    const secret = args[2];
    
    const isValid = verifyJWT(token, secret);
    console.log(JSON.stringify({ valid: isValid, token }));
    return;
  }
  
  // 🔑 Schlüsselgenerierungsmodus
  const secret = args[0] || process.env.SUPABASE_JWT_SECRET;
  
  if (!secret) {
    console.error('❌ Fehler: Kein JWT-Secret angegeben.');
    console.error('💡 Verwendung: node generate-supabase-keys.mjs <secret>');
    process.exit(1);
  }
  
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + (200 * 365 * 24 * 60 * 60); // 200 Jahre in Sekunden
  
  const anonPayload = {
    iss: 'supabase',
    iat,
    exp,
    role: 'anon'
  };
  
  const serviceRolePayload = {
    iss: 'supabase',
    iat,
    exp,
    role: 'service_role'
  };
  
  const anonKey = createJWT(anonPayload, secret);
  const serviceRoleKey = createJWT(serviceRolePayload, secret);
  
  // 📤 Ausgabe als JSON
  console.log(JSON.stringify({
    jwtSecret: secret,
    anonKey,
    serviceRoleKey
  }, null, 2));
}

main();
