import clsx from "clsx";
import Image from "next/image";
import { useMemo } from "react";

import { APP_LOGO_PATH, APP_LOGO_V2_PATH } from "@/constants/file";

export type LogoProps = {
  size?: "small" | "medium" | "large" | "xlarge";
  className?: string;
  useAppLogoV2?: boolean;
};

const Logo = ({ size = "medium", className, useAppLogoV2 = false }: LogoProps) => {
  const scale = useMemo(() => {
    switch (size) {
      case "small":
        return 0.75;
      case "large":
        return 1.25;
      case "xlarge":
        return 1.5;
      case "medium":
      default:
        return 1;
    }
  }, [size]);

  const { width, height } = useMemo(() => ({ width: 92 * scale, height: 46 * scale }), [scale]);

  return (
    <div className={clsx(className, "inline-flex")}>
      <Image
        src={useAppLogoV2 ? APP_LOGO_V2_PATH : APP_LOGO_PATH}
        alt="AUTOTMS"
        width={width}
        height={height}
        priority
      />
    </div>
  );
};

export default Logo;
