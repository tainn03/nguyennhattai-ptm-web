# GSS TMS-Web

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.


<br/>

# Create developers facebook apps
1. Bắt đầu quy trình đăng ký tại
    - Link: https://developers.facebook.com/async/registration
2. Thực hiện các bước đăng ký
    - My Apps -> Create App -> Allow people to log in with their Facebook account
3. Setting Valid OAuth Redirect URIs:
    - Dashboard -> Products -> Configure -> Settings -> Valid OAuth Redirect URIs (url login callback)
4. Lấy App ID and App secret key
    - Link: https://developers.facebook.com/apps/342914624848230/settings/basic/
5. Thêm user test cho mode develop
    1. Tạo tài khoản developer facebook mới
        - Link:  https://developers.facebook.com/async/registration
    2. Dùng tài khoản admin tạo ở bước 1 thêm user vừa tạo để trở thành user test
        - App toles -> Roles -> Testers -> Add Testers -> Dùng tài khoản được thêm  chấp nhận yêu cầu Add Testers


<br/>

# Create developers google apps
1. Tạo dự án mới
    - Link: https://console.cloud.google.com -> chọn `New Project`
2. Cấu hình OAuth consent screen
    - User Type: External
3. Cấu hình App information:
    - App name
    - Authorized domains
    - Add Test users
4. Create credentials
    - Create OAuth client ID
    - Application type: Web application
    - Name
    - Authorized JavaScript origins: Web domain
    - Authorized redirect URIs: Redirect url after login
5. Lấy Client ID và Client secret key

