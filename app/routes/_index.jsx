import {useRouteError, isRouteErrorResponse, Link} from '@remix-run/react';

export default function Index() {
  return (
    <>
      <p>
        Edit this route in <em>app/routes/index.tsx</em>.
      </p>
      <p>
        <Link to="/products/abcdef">TEST product</Link>
      </p>
    </>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    console.error(error.status, error.statusText, error.data);
    return <div>Route Error</div>;
  } else {
    console.error(error.message);
    return <div>Thrown Error</div>;
  }
}
