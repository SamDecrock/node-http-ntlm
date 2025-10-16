// Type definitions for httpntlm
// Project: https://github.com/SamDecrock/node-http-ntlm
// Definitions by: DeepAgent

/// <reference types="node" />

declare module 'httpntlm' {
  import { Agent } from 'http';

  /**
   * Options for NTLM HTTP requests
   */
  export interface HttpntlmOptions {
    /** The URL to make the request to */
    url: string;
    
    /** Username for NTLM authentication */
    username: string;
    
    /** Password for NTLM authentication */
    password?: string;
    
    /** Workstation name (optional) */
    workstation?: string;
    
    /** Domain name (optional) */
    domain?: string;
    
    /** Pre-computed LM password hash (optional) */
    lm_password?: Buffer;
    
    /** Pre-computed NT password hash (optional) */
    nt_password?: Buffer;
    
    /** Custom HTTP agent (optional) */
    agent?: Agent;
    
    /** Request timeout in milliseconds (optional) */
    timeout?: number;
    
    /** Custom HTTP headers (optional) */
    headers?: { [key: string]: string };
    
    /** Request body (optional) */
    body?: string | Buffer;
    
    /** JSON object to send as request body (optional) */
    json?: any;
    
    /** Form parameters to send (optional) */
    parameters?: { [key: string]: any };
    
    /** Files to upload (optional) */
    files?: { [key: string]: string | Buffer };
    
    /** Whether to return response body as binary Buffer (optional) */
    binary?: boolean;
    
    /** Character encoding for response (optional) */
    encoding?: string;
  }

  /**
   * Response from NTLM HTTP request
   */
  export interface HttpntlmResponse {
    /** Response headers */
    headers: { [key: string]: string | string[] };
    
    /** Response body (string or Buffer depending on options) */
    body: string | Buffer;
    
    /** HTTP status code */
    statusCode: number;
    
    /** Response cookies (optional) */
    cookies?: string[];
  }

  /**
   * Callback function for NTLM HTTP requests
   */
  export type HttpntlmCallback = (err: Error | null, response?: HttpntlmResponse) => void;

  /**
   * Performs an HTTP GET request with NTLM authentication
   * @param options - Request options
   * @param callback - Callback function
   */
  export function get(options: HttpntlmOptions, callback: HttpntlmCallback): void;

  /**
   * Performs an HTTP POST request with NTLM authentication
   * @param options - Request options
   * @param callback - Callback function
   */
  export function post(options: HttpntlmOptions, callback: HttpntlmCallback): void;

  /**
   * Performs an HTTP PUT request with NTLM authentication
   * @param options - Request options
   * @param callback - Callback function
   */
  export function put(options: HttpntlmOptions, callback: HttpntlmCallback): void;

  /**
   * Performs an HTTP PATCH request with NTLM authentication
   * @param options - Request options
   * @param callback - Callback function
   */
  export function patch(options: HttpntlmOptions, callback: HttpntlmCallback): void;

  /**
   * Performs an HTTP DELETE request with NTLM authentication
   * @param options - Request options
   * @param callback - Callback function
   */
  export { del as delete };
  export function del(options: HttpntlmOptions, callback: HttpntlmCallback): void;

  /**
   * Performs an HTTP OPTIONS request with NTLM authentication
   * @param options - Request options
   * @param callback - Callback function
   */
  export function options(options: HttpntlmOptions, callback: HttpntlmCallback): void;

  /**
   * Performs an HTTP request with specified method and NTLM authentication
   * @param method - HTTP method (GET, POST, PUT, etc.)
   * @param options - Request options
   * @param callback - Callback function
   */
  export function method(method: string, options: HttpntlmOptions, callback: HttpntlmCallback): void;

  /**
   * Type 2 message structure from NTLM handshake
   */
  export interface Type2Message {
    /** NTLM signature */
    signature: Buffer;
    
    /** Message type (should be 2) */
    type: number;
    
    /** Target name */
    targetName: string;
    
    /** Negotiation flags */
    flags: number;
    
    /** Server challenge */
    challenge: Buffer;
    
    /** Target information */
    targetInfo?: Buffer;
  }

  /**
   * Low-level NTLM utilities
   */
  export namespace ntlm {
    /**
     * Creates NTLM Type 1 message
     * @param workstation - Workstation name
     * @param domain - Domain name
     * @returns Type 1 message buffer
     */
    export function createType1Message(workstation?: string, domain?: string): Buffer;
    
    /**
     * Parses NTLM Type 2 message
     * @param buffer - Type 2 message buffer
     * @returns Parsed Type 2 message
     */
    export function parseType2Message(buffer: Buffer): Type2Message;
    
    /**
     * Creates NTLM Type 3 message
     * @param type2Message - Parsed Type 2 message
     * @param username - Username
     * @param password - Password
     * @param workstation - Workstation name
     * @param domain - Domain name
     * @returns Type 3 message buffer
     */
    export function createType3Message(
      type2Message: Type2Message,
      username: string,
      password: string,
      workstation?: string,
      domain?: string
    ): Buffer;
    
    /**
     * Creates NT hashed password
     * @param password - Plain text password
     * @returns NT hashed password buffer
     */
    export function create_NT_hashed_password(password: string): Buffer;
    
    /**
     * Creates LM hashed password
     * @param password - Plain text password
     * @returns LM hashed password buffer
     */
    export function create_LM_hashed_password(password: string): Buffer;
  }
}