"use client";

import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@/components/atoms";
import { PageHeader } from "@/components/molecules";

export default function Page() {
  return (
    <div>
      <PageHeader title="ENV" actionHorizontal />

      <TableContainer className="mt-10">
        <Table>
          <TableHead uppercase>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Client</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>VERCEL_ENV</TableCell>
              <TableCell>{process.env.VERCEL_ENV}</TableCell>
            </TableRow>

            <TableRow>
              <TableCell>NODE_ENV</TableCell>
              <TableCell>{process.env.NODE_ENV}</TableCell>
            </TableRow>

            <TableRow>
              <TableCell>HOSTNAME</TableCell>
              <TableCell>{process.env.HOSTNAME}</TableCell>
            </TableRow>

            <TableRow>
              <TableCell>PORT</TableCell>
              <TableCell>{process.env.PORT}</TableCell>
            </TableRow>

            <TableRow>
              <TableCell>NEXT_PUBLIC_APP_SECRET</TableCell>
              <TableCell>{process.env.NEXT_PUBLIC_APP_SECRET}</TableCell>
            </TableRow>

            <TableRow>
              <TableCell>APP_SECRET</TableCell>
              <TableCell>{process.env.APP_SECRET}</TableCell>
            </TableRow>

            <TableRow>
              <TableCell>NEXTAUTH_URL</TableCell>
              <TableCell>{process.env.NEXTAUTH_URL}</TableCell>
            </TableRow>

            <TableRow>
              <TableCell>NEXTAUTH_SECRET</TableCell>
              <TableCell>{process.env.NEXTAUTH_SECRET}</TableCell>
            </TableRow>

            <TableRow>
              <TableCell>STRAPI_API_URL</TableCell>
              <TableCell>{process.env.STRAPI_API_URL}</TableCell>
            </TableRow>

            <TableRow>
              <TableCell>STRAPI_GRAPHQL_URL</TableCell>
              <TableCell>{process.env.STRAPI_GRAPHQL_URL}</TableCell>
            </TableRow>

            <TableRow>
              <TableCell>STRAPI_TOKEN_KEY</TableCell>
              <TableCell>{process.env.STRAPI_TOKEN_KEY}</TableCell>
            </TableRow>

            <TableRow>
              <TableCell>DATABASE_URL</TableCell>
              <TableCell>{process.env.DATABASE_URL}</TableCell>
            </TableRow>

            <TableRow>
              <TableCell>NEXT_PUBLIC_GOOGLE_CLIENT_ID</TableCell>
              <TableCell>{process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}</TableCell>
            </TableRow>

            <TableRow>
              <TableCell>GOOGLE_CLIENT_SECRET</TableCell>
              <TableCell>{process.env.GOOGLE_CLIENT_SECRET}</TableCell>
            </TableRow>

            <TableRow>
              <TableCell>NEXT_PUBLIC_FACEBOOK_CLIENT_ID</TableCell>
              <TableCell>{process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID}</TableCell>
            </TableRow>

            <TableRow>
              <TableCell>FACEBOOK_CLIENT_SECRET</TableCell>
              <TableCell>{process.env.FACEBOOK_CLIENT_SECRET}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}
