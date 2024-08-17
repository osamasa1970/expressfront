import {json} from '@remix-run/node';
import {useLoaderData} from '@remix-run/react';

/**
 * @param {LoaderFunctionArgs}
 */
export async function loader({params, context}) {
  const {handle} = params;
  const {storefront} = context;

  if (!handle) {
    throw new Error('Expected product handle to be defined');
  }

  const {product} = await storefront.query(
    `#graphql
    query Product( $handle: String!) {
      product(handle: $handle) {
        id
        title
        descriptionHtml
      }
    }`,
    {variables: {handle}},
  );

  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  return json({product});
}

export default function Product() {
  const {
    product: {title, descriptionHtml},
  } = useLoaderData();

  return (
    <div className="product">
      <h1>{title}</h1>
      <br />
      <p>
        <strong>Description</strong>
      </p>
      <br />
      <div dangerouslySetInnerHTML={{__html: descriptionHtml}} />
      <br />
    </div>
  );
}

/** @typedef {import('@remix-run/node').LoaderFunctionArgs} LoaderFunctionArgs */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
