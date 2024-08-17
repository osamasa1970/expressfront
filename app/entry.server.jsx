/**
 * By default, Remix will handle generating the HTTP Response for you.
 * You are free to delete this file if you'd like to, but if you ever want it revealed again, you can run `npx remix reveal` ✨
 * For more information, see https://remix.run/file-conventions/entry.server
 */

import {PassThrough} from 'node:stream';
import {Response} from '@remix-run/web-fetch';
import {RemixServer} from '@remix-run/react';
import isbot from 'isbot';
import {renderToPipeableStream} from 'react-dom/server';
import {createContentSecurityPolicy} from '@shopify/hydrogen';

const ABORT_DELAY = 5_000;

/**
 * @param {Request} request
 * @param {number} responseStatusCode
 * @param {Headers} responseHeaders
 * @param {EntryContext} remixContext
 * @param {AppLoadContext} loadContext
 */
export default function handleRequest(
  request,
  responseStatusCode,
  responseHeaders,
  remixContext,
  loadContext,
) {
  return isbot(request.headers.get('user-agent'))
    ? handleBotRequest(
        request,
        responseStatusCode,
        responseHeaders,
        remixContext,
        loadContext,
      )
    : handleBrowserRequest(
        request,
        responseStatusCode,
        responseHeaders,
        remixContext,
      );
}

/**
 * @param {Request} request
 * @param {number} responseStatusCode
 * @param {Headers} responseHeaders
 * @param {EntryContext} remixContext
 * @param {AppLoadContext} context
 */
function handleBotRequest(
  request,
  responseStatusCode,
  responseHeaders,
  remixContext,
  context,
) {
  return new Promise((resolve, reject) => {
    const {nonce, header, NonceProvider} = createContentSecurityPolicy({
      shop: {
        checkoutDomain: context.env.PUBLIC_CHECKOUT_DOMAIN,
        storeDomain: context.env.PUBLIC_STORE_DOMAIN,
      },
    });

    const {pipe, abort} = renderToPipeableStream(
      <NonceProvider>
        <RemixServer
          context={remixContext}
          url={request.url}
          abortDelay={ABORT_DELAY}
        />
      </NonceProvider>,
      {
        nonce,
        onAllReady() {
          const body = new PassThrough();

          responseHeaders.set('Content-Type', 'text/html');
          responseHeaders.set('Content-Security-Policy', header);

          resolve(
            new Response(body, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );

          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          console.error(error?.stack ? error.stack : error);
        },
      },
    );

    setTimeout(abort, ABORT_DELAY);
  });
}

/**
 * @param {Request} request
 * @param {number} responseStatusCode
 * @param {Headers} responseHeaders
 * @param {EntryContext} remixContext
 */
function handleBrowserRequest(
  request,
  responseStatusCode,
  responseHeaders,
  remixContext,
) {
  const {nonce, header, NonceProvider} = createContentSecurityPolicy();

  return new Promise((resolve, reject) => {
    const {pipe, abort} = renderToPipeableStream(
      <NonceProvider>
        <RemixServer
          context={remixContext}
          url={request.url}
          abortDelay={ABORT_DELAY}
        />
      </NonceProvider>,
      {
        nonce,
        onShellReady() {
          const body = new PassThrough();

          responseHeaders.set('Content-Type', 'text/html');
          responseHeaders.set('Content-Security-Policy', header);

          resolve(
            new Response(body, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );

          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          console.error(error?.stack ? error.stack : error);
          responseStatusCode = 500;
        },
      },
    );

    setTimeout(abort, ABORT_DELAY);
  });
}

/** @typedef {import('@remix-run/node').AppLoadContext} AppLoadContext */
/** @typedef {import('@remix-run/node').EntryContext} EntryContext */
