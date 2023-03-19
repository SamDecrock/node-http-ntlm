var rewire = require("rewire");
var ntlm = rewire("./ntlm.js");

function test_create_LM_hashed_password_v1() {
  console.log('> testing create_LM_hashed_password_v1');
  const create_LM_hashed_password_v1 = ntlm.__get__("create_LM_hashed_password_v1");

  var realResponse = create_LM_hashed_password_v1('Azx123456');
  console.log('realResponse', realResponse);

  var expectedResponse = Buffer.from([0xb7, 0xb4, 0x13, 0x5f, 0xa3, 0x05, 0x76, 0x82, 0x1e, 0x92, 0x9f, 0xfc, 0x01, 0x39, 0x51, 0x27]);
  return realResponse.equals(expectedResponse);
}


function test_create_NT_hashed_password_v1() {
  console.log('> testing create_NT_hashed_password_v1');
  const create_NT_hashed_password_v1 = ntlm.__get__("create_NT_hashed_password_v1");

  var realResponse = create_NT_hashed_password_v1('Azx123456');
  console.log('realResponse', realResponse);

  var expectedResponse = Buffer.from([0x96, 0x1b, 0x07, 0xdb, 0xdc, 0xcf, 0x86, 0x9f, 0x2a, 0x3c, 0x99, 0x1c, 0x83, 0x94, 0x0e, 0x01]);
  return realResponse.equals(expectedResponse);
}

function test_calc_resp() {
  console.log('> testing calc_resp');
  const calc_resp = ntlm.__get__("calc_resp");

  var password_hash = Buffer.from([ 183, 180, 19, 95, 163, 5, 118, 130, 30, 146, 159, 1, 57, 81, 39, 252, 1, 57, 81, 39, 252 ]);
  var server_challenge = Buffer.from([150, 27, 7, 219, 220, 207, 134, 159]);

  var realResponse = calc_resp(password_hash, server_challenge);
  console.log('calc_resp:', realResponse);

  var expectedResponse = Buffer.from([0xaf, 0x00, 0xee, 0x2f, 0xd7, 0x8c, 0xaf, 0x4a, 0xab, 0x57, 0xcc, 0xcb, 0xb0, 0x93, 0x58, 0x62, 0x31, 0x69, 0x02, 0x92, 0x4d, 0x34, 0xbc, 0x92]);
  return realResponse.equals(expectedResponse);
}


console.log(test_create_LM_hashed_password_v1());
console.log(test_create_NT_hashed_password_v1());
console.log(test_calc_resp());