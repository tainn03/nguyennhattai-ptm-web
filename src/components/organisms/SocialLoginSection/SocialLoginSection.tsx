import { FaGoogle as FaGoogleIcon } from "react-icons/fa";
import { FaFacebook as FaFacebookIcon } from "react-icons/fa";

import { Button } from "@/components/molecules";

export type SocialLoginSectionProps = {
  title: string;
  disabledGoogle?: boolean;
  disabledFacebook?: boolean;
  onGoogleClick?: () => void;
  onFacebookClick?: () => void;
};

const SocialLoginSection = ({
  title,
  onGoogleClick,
  onFacebookClick,
  disabledGoogle = false,
  disabledFacebook = false,
}: SocialLoginSectionProps) => {
  return (
    <>
      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-sm font-medium leading-6">
          <span className="bg-white px-6 text-gray-900">{title}</span>
        </div>
      </div>

      <div className="mt-6 grid w-full grid-cols-1 gap-4">
        <Button disabled={disabledGoogle} color="error" icon={FaGoogleIcon} onClick={onGoogleClick}>
          Google
        </Button>
        <Button disabled={disabledFacebook} icon={FaFacebookIcon} onClick={onFacebookClick}>
          Facebook
        </Button>
      </div>
    </>
  );
};

export default SocialLoginSection;
