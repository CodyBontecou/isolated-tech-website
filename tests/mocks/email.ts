/**
 * Email mocks for testing
 */

import { vi } from "vitest";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

interface SentEmail extends EmailOptions {
  sentAt: Date;
  messageId: string;
}

/**
 * Create a mock email sender that tracks sent emails
 */
export function createMockEmailSender() {
  const sentEmails: SentEmail[] = [];
  let shouldFail = false;
  let failureMessage = "Mock email failure";

  return {
    sendEmail: vi.fn(async (options: EmailOptions) => {
      if (shouldFail) {
        return { error: failureMessage };
      }
      
      const messageId = `ses_mock_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      sentEmails.push({
        ...options,
        sentAt: new Date(),
        messageId,
      });
      return { messageId };
    }),
    
    getSentEmails: () => [...sentEmails],
    
    getLastEmail: () => sentEmails.length > 0 ? sentEmails[sentEmails.length - 1] : null,
    
    clearEmails: () => {
      sentEmails.length = 0;
    },
    
    setFailure: (shouldFailNext: boolean, message = "Mock email failure") => {
      shouldFail = shouldFailNext;
      failureMessage = message;
    },
    
    getEmailCount: () => sentEmails.length,
    
    findEmailTo: (email: string) => sentEmails.find(e => e.to === email),
    
    findEmailsWithSubject: (subject: string) => 
      sentEmails.filter(e => e.subject.includes(subject)),
  };
}

/**
 * Create a mock fetch function that simulates AWS SES responses
 */
export function createMockSESFetch(options: {
  shouldSucceed?: boolean;
  messageId?: string;
  errorMessage?: string;
} = {}) {
  const { 
    shouldSucceed = true, 
    messageId = "mock-message-id-123",
    errorMessage = "InvalidParameterValue",
  } = options;

  return vi.fn(async (url: string, init?: RequestInit) => {
    // Validate it's an SES request
    if (!url.includes("email.") || !url.includes(".amazonaws.com")) {
      return new Response("Not Found", { status: 404 });
    }

    if (shouldSucceed) {
      return new Response(
        `<SendEmailResponse xmlns="http://ses.amazonaws.com/doc/2010-12-01/">
          <SendEmailResult>
            <MessageId>${messageId}</MessageId>
          </SendEmailResult>
          <ResponseMetadata>
            <RequestId>mock-request-id</RequestId>
          </ResponseMetadata>
        </SendEmailResponse>`,
        { status: 200 }
      );
    } else {
      return new Response(
        `<ErrorResponse xmlns="http://ses.amazonaws.com/doc/2010-12-01/">
          <Error>
            <Type>Sender</Type>
            <Code>${errorMessage}</Code>
            <Message>${errorMessage}</Message>
          </Error>
          <RequestId>mock-request-id</RequestId>
        </ErrorResponse>`,
        { status: 400 }
      );
    }
  });
}

/**
 * Mock env with email-related settings
 */
export function createEmailEnv(options: {
  hasAwsCredentials?: boolean;
  accessKeyId?: string;
  secretAccessKey?: string;
} = {}) {
  const {
    hasAwsCredentials = true,
    accessKeyId = "AKIAIOSFODNN7EXAMPLE",
    secretAccessKey = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  } = options;

  return {
    AWS_ACCESS_KEY_ID: hasAwsCredentials ? accessKeyId : undefined,
    AWS_SECRET_ACCESS_KEY: hasAwsCredentials ? secretAccessKey : undefined,
    DB: {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      }),
    },
  };
}
