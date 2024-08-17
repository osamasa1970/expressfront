import {defer} from '@remix-run/node';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from '@remix-run/react';
import styles from './styles/app.css?url';
import {useNonce} from '@shopify/hydrogen';

/**
 * @type {LinksFunction}
 */
export const links = () => {
  return [
    {rel: 'stylesheet', href: styles},
    {
      rel: 'preconnect',
      href: 'https://cdn.shopify.com',
    },
    {
      rel: 'preconnect',
      href: 'https://shop.app',
    },
    {rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg'},
  ];
};

/**
 * @param {LoaderFunctionArgs}
 */
export async function loader({context}) {
  const [customerAccessToken, cartId] = await Promise.all([
    context.session.get('customerAccessToken'),
    context.session.get('cartId'),
  ]);

  const [cart, layout] = await Promise.all([
    cartId
      ? (
          await context.storefront.query(CART_QUERY, {
            variables: {
              cartId,
              /**
                    Country and language properties are automatically injected
                    into all queries. Passing them is unnecessary unless you
                    want to override them from the following default:
                    */
              country: context.storefront.i18n?.country,
              language: context.storefront.i18n?.language,
            },
            cache: context.storefront.CacheNone(),
          })
        ).cart
      : null,
    await context.storefront.query(LAYOUT_QUERY),
  ]);

  return defer({
    isLoggedIn: Boolean(customerAccessToken),
    cart,
    layout,
  });
}

/**
 * @param {{children?: React.ReactNode}}
 */
export function Layout({children}) {
  const data = useRouteLoaderData('root');
  const nonce = useNonce();

  const shop = data?.layout.shop;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {data ? (
          <div className="PageLayout">
            <h1>{shop?.name} (skeleton)</h1>
            <h2>{shop?.description}</h2>
            {children}
          </div>
        ) : (
          children
        )}
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

const CART_QUERY = `#graphql
  query CartQuery($cartId: ID!) {
    cart(id: $cartId) {
      ...CartFragment
    }
  }

  fragment CartFragment on Cart {
    id
    checkoutUrl
    totalQuantity
    buyerIdentity {
      countryCode
      customer {
        id
        email
        firstName
        lastName
        displayName
      }
      email
      phone
    }
    lines(first: 100) {
      edges {
        node {
          id
          quantity
          attributes {
            key
            value
          }
          cost {
            totalAmount {
              amount
              currencyCode
            }
            amountPerQuantity {
              amount
              currencyCode
            }
            compareAtAmountPerQuantity {
              amount
              currencyCode
            }
          }
          merchandise {
            ... on ProductVariant {
              id
              availableForSale
              compareAtPrice {
                ...MoneyFragment
              }
              price {
                ...MoneyFragment
              }
              requiresShipping
              title
              image {
                ...ImageFragment
              }
              product {
                handle
                title
                id
              }
              selectedOptions {
                name
                value
              }
            }
          }
        }
      }
    }
    cost {
      subtotalAmount {
        ...MoneyFragment
      }
      totalAmount {
        ...MoneyFragment
      }
      totalDutyAmount {
        ...MoneyFragment
      }
      totalTaxAmount {
        ...MoneyFragment
      }
    }
    note
    attributes {
      key
      value
    }
    discountCodes {
      code
    }
  }

  fragment MoneyFragment on MoneyV2 {
    currencyCode
    amount
  }

  fragment ImageFragment on Image {
    id
    url
    altText
    width
    height
  }
`;

const LAYOUT_QUERY = `#graphql
  query layout {
    shop {
      name
      description
    }
  }
`;

/** @typedef {import('@remix-run/node').LinksFunction} LinksFunction */
/** @typedef {import('@remix-run/node').LoaderFunctionArgs} LoaderFunctionArgs */
/** @typedef {import('@shopify/hydrogen/storefront-api-types').Cart} Cart */
/** @typedef {import('@shopify/hydrogen/storefront-api-types').Shop} Shop */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
/** @typedef {LoaderReturnData} RootLoader */
