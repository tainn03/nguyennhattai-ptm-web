import { Logo } from "@/components/atoms";

type Props = {
  onGoHome: () => void;
};

export default function NotFound({ onGoHome }: Props) {
  return (
    <div className="grid min-h-full grid-cols-1 grid-rows-[1fr,auto,1fr] bg-white lg:grid-cols-[max(50%,36rem),1fr]">
      <header className="mx-auto w-full max-w-7xl px-6 pt-6 sm:pt-10 lg:col-span-2 lg:col-start-1 lg:row-start-1 lg:px-8">
        <a href="#">
          <span className="sr-only">AUTOTMS</span>
          <Logo size="large" />
        </a>
      </header>
      <main className="mx-auto w-full max-w-7xl px-6 py-24 sm:py-32 lg:col-span-2 lg:col-start-1 lg:row-start-2 lg:px-8">
        <div className="max-w-lg">
          <p className="text-base font-semibold leading-8 text-blue-600">404</p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">Không tìm thấy trang</h1>
          <p className="mt-6 text-base leading-7 text-gray-600">
            Xin lỗi, chúng tôi không thể tìm thấy trang bạn đang truy cập, xin hãy kiểm tra lại.
          </p>
          <div className="mt-10">
            <p className="cursor-pointer text-sm font-semibold leading-7 text-blue-600" onClick={onGoHome}>
              <span aria-hidden="true">&larr;</span> Về trang chủ
            </p>
          </div>
        </div>
      </main>
      <footer className="self-end lg:col-span-2 lg:col-start-1 lg:row-start-3">
        <div className="border-t border-gray-100 bg-gray-50 py-10">
          <nav className="mx-auto flex w-full max-w-7xl items-center gap-x-4 px-6 text-sm leading-7 text-gray-600 lg:px-8">
            <p className="text-center text-gray-500">&copy; 2023 Green Space Solution. All rights reserved.</p>
          </nav>
        </div>
      </footer>
      <div className="hidden lg:relative lg:col-start-2 lg:row-start-1 lg:row-end-4 lg:block">
        {/* <img
          src="https://images.unsplash.com/photo-1470847355775-e0e3c35a9a2c?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=1825&q=80"
          src="https://blog.intekfreight-logistics.com/hs-fs/hubfs/Fuel_Money_Icons_Misc/Inland%20Container%20Management.jpg?height=630&name=Inland%20Container%20Management.jpg"
          src="https://blog.intekfreight-logistics.com/hs-fs/hubfs/frieght%20pricing-1.jpeg?width=442&name=frieght%20pricing-1.jpeg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        /> */}
        <img className="absolute inset-0 h-full w-full object-cover" src="/assets/images/auth-ai.jpg" alt="" />
      </div>
    </div>
  );
}
