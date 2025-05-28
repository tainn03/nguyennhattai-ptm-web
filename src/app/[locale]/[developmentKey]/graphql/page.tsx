"use client";

import { gql } from "graphql-request";
import { getSession, signIn, signOut } from "next-auth/react";
import { useCallback, useState } from "react";

import { Button, PageHeader, TextField } from "@/components/molecules";
import { useAuth } from "@/hooks";
import { AnyObject } from "@/types";
import { graphQLPost, post } from "@/utils/api";

export default function Page() {
  const { orgId, org, userId, user, isLoading, isAuthenticated, isUnauthenticated, reloadUserProfile } = useAuth(false);
  const [apiResult, setApiResult] = useState<string | AnyObject | undefined>();
  const [query, setQuery] = useState<string>(gql`
    query {
      maintenanceTypes {
        data {
          id
        }
      }

      administrativeUnit(id: 1) {
        data {
          id
          attributes {
            code
            name
            type
            parentCode
            level
            isActive
          }
        }
      }

      administrativeUnits {
        data {
          id
          attributes {
            code
            name
            type
            parentCode
            level
            isActive
          }
        }
        meta {
          pagination {
            total
            page
            pageSize
            pageCount
          }
        }
      }
    }
  `);

  const handleSignIn = useCallback(async () => {
    await signIn("credentials", {
      redirect: false,
      identifier: "nghia.tong@gss-sol.com",
      password: "Gss@20220620",
    });
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut({ redirect: false });
    setApiResult(undefined);
  }, []);

  const handleCallAPI = useCallback(async () => {
    setApiResult("Fetching...");
    try {
      const result = await graphQLPost<AnyObject>({
        query,
      });
      setApiResult(result);
    } catch (err) {
      const { response } = err as AnyObject;
      setApiResult(response.data);
    }
  }, [query]);

  const handleCallAPISendEmail = async () => {
    await post("/api/auth/forgot-password", {
      email: "nhuttramtv.vn@gmail.com",
    })
      // eslint-disable-next-line promise/always-return
      .then((response) => {
        // Handle the successful response here
        console.log("Response:", response);
      })
      .catch((error) => {
        // Handle any errors that occurred during the request
        console.error("Error:", error);
      });
  };

  const handleLogSession = async () => {
    const session = await getSession();
    console.log(`#handleLogSession: session=${JSON.stringify(session, null, 2)}`);
  };

  return (
    <div>
      <PageHeader
        title="Auth & GraphQL Testing Page"
        actionHorizontal
        actionComponent={
          user && (
            <div>
              Hello: <span className="font-medium italic">{user.username}</span>
            </div>
          )
        }
      />

      <div className="mt-10 grid grid-cols-3 gap-4">
        <div className="col-span-2 flex flex-col gap-2">
          <div className="flex flex-row gap-4">
            <Button onClick={() => reloadUserProfile()}>Reload user profile</Button>
            <Button onClick={handleSignIn}>Sign-In</Button>
            <Button onClick={handleSignOut}>Sign-Out</Button>
            <Button onClick={handleCallAPISendEmail}>Send email</Button>
            <Button onClick={handleLogSession}>Log session to console</Button>
          </div>

          <span>
            <span className="font-medium">status:</span> {isLoading && "loading"} {isAuthenticated && "authenticated"}{" "}
            {isUnauthenticated && "unauthenticated"}
          </span>
          <span>
            <span className="font-medium">orgId:</span> {orgId}
          </span>
          <span>
            <span className="font-medium">org:</span>
            <div className="whitespace-pre font-mono">{JSON.stringify(org, null, 2)}</div>
          </span>
          <span>
            <span className="font-medium">userId:</span> {userId}
          </span>
          <span>
            <span className="font-medium">user:</span>
            <div className="whitespace-pre font-mono">{JSON.stringify(user, null, 2)}</div>
          </span>
          <span>
            <span className="font-medium">apiResult:</span>{" "}
            {typeof apiResult === "string" ? (
              apiResult
            ) : (
              <div className="whitespace-pre font-mono">{JSON.stringify(apiResult, null, 2)}</div>
            )}
          </span>
        </div>

        <div className="col-span-1 flex flex-col gap-4">
          <div className="flex flex-row items-center justify-between gap-4">
            <label className="font-medium">GraphQL</label>
            <Button onClick={handleCallAPI}>Call API</Button>
          </div>
          <TextField multiline rows={20} value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
      </div>
    </div>
  );
}
