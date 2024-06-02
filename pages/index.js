import Head from "next/head";
import Link from "next/link";
import {useUser} from "@auth0/nextjs-auth0/client";
import { getSession } from "@auth0/nextjs-auth0";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRobot } from "@fortawesome/free-solid-svg-icons";

export default function Home() {
  const { isLoading, user, error } = useUser();
  if (isLoading) return (<div>Loading...</div>);
  if (error) return (<div>{error.message}</div>);
  return (
    <>
      <Head>
        <title>Buccos AI Bot - Login or Signup</title>
      </Head>
      <div className="flex justify-center items-center min-h-screen w-full bg-gray-800 text-white text-center">
        <div className="">
          <div>
            <FontAwesomeIcon icon={faRobot} className="text-yellow-500 text-6xl"/>
          </div>
          <h1 className="text-3xl pt-2">Welcome to Buccos AI Bot 🏴‍☠️</h1>
          <p className="text-lg pb-4">Login with your account to contine.</p>
          {!user && 
            <>
              {/* our btn component class name uses a component to basically "wrap" all the style classes into a single class. See globals.css */}
              <Link href="/api/auth/login" className="btn">Login</Link>
              <Link href="/api/auth/signup" className="btn mx-4">Signup</Link>
            </>
          }
        </div>
      </div>
    </>
  );
}

// must be named getServerSideProps exactly
// this runs a function server-side before any page is loaded.
// can be used to redirect where necessary
export const getServerSideProps = async (context) => {
  const session = await getSession(context.req, context.res);
  if(!!session) {
    return {
      redirect: {
        destination: '/chat'
      },
    };
  }
  return {
    props: {}
  }
}
