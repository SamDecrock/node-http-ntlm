/**
 * Tests against the official test vectors from the Microsoft NTLM specification:
 *   [MS-NLMP] NT LAN Manager (NTLM) Authentication Protocol, section 4.2 "Cryptographic Values for Validation"
 *   https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-nlmp/
 *
 * Unlike the tests in unit.js (which guard against regressions of this library's own output),
 * these tests verify the implementation against an independent source.
 *
 * Common values (section 4.2.1):
 *   User             = "User"
 *   UserDom          = "Domain"
 *   Passwd           = "Password"
 *   ServerName       = "Server"
 *   Workstation      = "COMPUTER"
 *   Time             = 0
 *   ClientChallenge  = aa aa aa aa aa aa aa aa
 *   ServerChallenge  = 01 23 45 67 89 ab cd ef
 */

var rewire = require("rewire");
var ntlm = rewire("../ntlm.js");
var assert = require('assert');

var hex = function (s) { return Buffer.from(s.replace(/\s+/g, ''), 'hex'); };

var USER = 'User';
var DOMAIN = 'Domain';
var PASSWORD = 'Password';
var SERVER_CHALLENGE = hex('01 23 45 67 89 ab cd ef');
var CLIENT_CHALLENGE = hex('aa aa aa aa aa aa aa aa');

// AV pairs: MsvAvNbDomainName "Domain", MsvAvNbComputerName "Server", MsvAvEOL (section 4.2.4)
var TARGET_INFO = hex(
  '02 00 0c 00 44 00 6f 00 6d 00 61 00 69 00 6e 00' +
  '01 00 0c 00 53 00 65 00 72 00 76 00 65 00 72 00' +
  '00 00 00 00'
);

// Time = 0 in NTLM (100ns intervals since 1601) corresponds to this Unix timestamp in ms.
var UNIX_MS_FOR_NTLM_TIME_ZERO = -11644473600000;


describe('[MS-NLMP] 4.2 test vectors', () => {

  var originalDate;

  before(() => {
    originalDate = ntlm.__get__('Date');
  });

  after(() => {
    ntlm.__set__('Date', originalDate);
  });


  describe('4.2.2 NTLM v1 Authentication', () => {

    it('4.2.2.1.1 LMOWFv1()', () => {
      var LMOWFv1 = ntlm.__get__('create_LM_hashed_password_v1');

      assert.deepEqual(
        LMOWFv1(PASSWORD),
        hex('e5 2c ac 67 41 9a 9a 22 4a 3b 10 8f 3f a6 cb 6d')
      );
    });

    it('4.2.2.1.2 NTOWFv1()', () => {
      var NTOWFv1 = ntlm.__get__('create_NT_hashed_password_v1');

      assert.deepEqual(
        NTOWFv1(PASSWORD),
        hex('a4 f4 9c 40 65 10 bd ca b6 82 4e e7 c3 0f d8 52')
      );
    });

    it('4.2.2.2.1 NTLMv1 Response', () => {
      var NTOWFv1 = ntlm.__get__('create_NT_hashed_password_v1');
      var calc_resp = ntlm.__get__('calc_resp');

      assert.deepEqual(
        calc_resp(NTOWFv1(PASSWORD), SERVER_CHALLENGE),
        hex('67 c4 30 11 f3 02 98 a2 ad 35 ec e6 4f 16 33 1c 44 bd be d9 27 84 1f 94')
      );
    });

    it('4.2.2.2.2 LMv1 Response', () => {
      var LMOWFv1 = ntlm.__get__('create_LM_hashed_password_v1');
      var calc_resp = ntlm.__get__('calc_resp');

      assert.deepEqual(
        calc_resp(LMOWFv1(PASSWORD), SERVER_CHALLENGE),
        hex('98 de f7 b8 7f 88 aa 5d af e2 df 77 96 88 a1 72 de f1 1c 7d 5c cd ef 13')
      );
    });
  });


  describe('4.2.3 NTLM v1 with Client Challenge (extended session security)', () => {

    it('4.2.3.2.1 LMv1 Response', () => {
      var NTOWFv1 = ntlm.__get__('create_NT_hashed_password_v1');
      var ntlm2sr_calc_resp = ntlm.__get__('ntlm2sr_calc_resp');

      var result = ntlm2sr_calc_resp(NTOWFv1(PASSWORD), SERVER_CHALLENGE, CLIENT_CHALLENGE);

      assert.deepEqual(
        result.lmChallengeResponse,
        hex('aa aa aa aa aa aa aa aa 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00')
      );
    });

    it('4.2.3.2.2 NTLMv1 Response', () => {
      var NTOWFv1 = ntlm.__get__('create_NT_hashed_password_v1');
      var ntlm2sr_calc_resp = ntlm.__get__('ntlm2sr_calc_resp');

      var result = ntlm2sr_calc_resp(NTOWFv1(PASSWORD), SERVER_CHALLENGE, CLIENT_CHALLENGE);

      assert.deepEqual(
        result.ntChallengeResponse,
        hex('75 37 f8 03 ae 36 71 28 ca 45 82 04 bd e7 ca f8 1e 97 ed 26 83 26 72 32')
      );
    });
  });


  describe('4.2.4 NTLMv2 Authentication', () => {

    beforeEach(() => {
      ntlm.__set__('Date', {
        now: function () { return UNIX_MS_FOR_NTLM_TIME_ZERO; }
      });
    });

    it('4.2.4.1.1 NTOWFv2()', () => {
      var NTOWFv1 = ntlm.__get__('create_NT_hashed_password_v1');
      var NTOWFv2 = ntlm.__get__('NTOWFv2');

      assert.deepEqual(
        NTOWFv2(NTOWFv1(PASSWORD), USER, DOMAIN),
        hex('0c 86 8a 40 3b fd 7a 93 a3 00 1e f2 2e f0 2e 3f')
      );
    });

    it('4.2.4.1.3 temp', () => {
      var NTOWFv1 = ntlm.__get__('create_NT_hashed_password_v1');
      var calc_ntlmv2_resp = ntlm.__get__('calc_ntlmv2_resp');

      var result = calc_ntlmv2_resp(NTOWFv1(PASSWORD), USER, DOMAIN, TARGET_INFO, SERVER_CHALLENGE, CLIENT_CHALLENGE);

      // ntChallengeResponse = NtProofStr (16 bytes) + temp
      assert.deepEqual(
        result.ntChallengeResponse.slice(16),
        hex(
          '01 01 00 00 00 00 00 00 00 00 00 00 00 00 00 00' +
          'aa aa aa aa aa aa aa aa 00 00 00 00 02 00 0c 00' +
          '44 00 6f 00 6d 00 61 00 69 00 6e 00 01 00 0c 00' +
          '53 00 65 00 72 00 76 00 65 00 72 00 00 00 00 00' +
          '00 00 00 00'
        )
      );
    });

    it('4.2.4.2.1 LMv2 Response', () => {
      var NTOWFv1 = ntlm.__get__('create_NT_hashed_password_v1');
      var calc_ntlmv2_resp = ntlm.__get__('calc_ntlmv2_resp');

      var result = calc_ntlmv2_resp(NTOWFv1(PASSWORD), USER, DOMAIN, TARGET_INFO, SERVER_CHALLENGE, CLIENT_CHALLENGE);

      assert.deepEqual(
        result.lmChallengeResponse,
        hex('86 c3 50 97 ac 9c ec 10 25 54 76 4a 57 cc cc 19 aa aa aa aa aa aa aa aa')
      );
    });

    it('4.2.4.2.2 NTLMv2 Response (NtProofStr)', () => {
      var NTOWFv1 = ntlm.__get__('create_NT_hashed_password_v1');
      var calc_ntlmv2_resp = ntlm.__get__('calc_ntlmv2_resp');

      var result = calc_ntlmv2_resp(NTOWFv1(PASSWORD), USER, DOMAIN, TARGET_INFO, SERVER_CHALLENGE, CLIENT_CHALLENGE);

      assert.deepEqual(
        result.ntChallengeResponse.slice(0, 16),
        hex('68 cd 0a b8 51 e5 1c 96 aa bc 92 7b eb ef 6a 1c')
      );
    });
  });

});
