"use client";

import { EmailTemplateType } from "@prisma/client";
import { FormikHelpers, useFormik } from "formik";
import { useCallback, useMemo } from "react";
import * as yup from "yup";

import { Button, InputGroup, PageHeader, Select, TextField } from "@/components/molecules";
import { SelectItem } from "@/components/molecules/Select/Select";
import { DEFAULT_LOCALE } from "@/constants/locale";
import { FORGOT_PASSWORD_EXPIRATION_SECONDS } from "@/constants/token";
import { useNotification } from "@/redux/actions";
import { YubObjectSchema } from "@/types";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { LocaleType } from "@/types/locale";
import { post } from "@/utils/api";
import { randomString } from "@/utils/string";

type TestEmailForm = {
  toEmail: string;
  type: string;
  data: string;
  locale?: LocaleType;
};

const EMAIL_TYPE_OPTIONS: SelectItem[] = [
  { value: EmailTemplateType.TEST_EMAIL, label: EmailTemplateType.TEST_EMAIL },
  { value: EmailTemplateType.VERIFICATION_CODE, label: EmailTemplateType.VERIFICATION_CODE },
  { value: EmailTemplateType.ACCOUNT_ACTIVATION, label: EmailTemplateType.ACCOUNT_ACTIVATION },
  { value: EmailTemplateType.WELCOME, label: EmailTemplateType.WELCOME },
  { value: EmailTemplateType.ADMIN_NEW_ORGANIZATION, label: EmailTemplateType.ADMIN_NEW_ORGANIZATION },
  { value: EmailTemplateType.USER_NEW_ORGANIZATION, label: EmailTemplateType.USER_NEW_ORGANIZATION },
];

const LOCALE_OPTIONS: SelectItem[] = [
  { value: "vi", label: "Tiếng Việt" },
  { value: "en", label: "English" },
];

const initialFormValues: TestEmailForm = {
  toEmail: "nghia.tong@gss-sol.com",
  type: EmailTemplateType.TEST_EMAIL,
  data: "",
  locale: DEFAULT_LOCALE,
};

const testEmailFormValidationSchema = yup.object<YubObjectSchema<TestEmailForm>>({
  toEmail: yup.string().trim().required("Vui lòng nhập email Người nhận"),
  data: yup
    .string()
    .nullable()
    .test("jsonType", "Lỗi format JSON", (value) => {
      try {
        if (value) {
          return !!JSON.parse(value);
        }
      } catch (ex) {
        return false;
      }
      return true;
    }),
});

export default function Page() {
  const { showNotification } = useNotification();

  const handleSubmitFormik = useCallback(async (values: TestEmailForm, formikHelpers: FormikHelpers<TestEmailForm>) => {
    console.log("#handleSubmitFormik: values=", values);
    const result = await post<ApiResult>("/api/settings/test-email", values);
    if (result.status === HttpStatusCode.Ok) {
      showNotification({
        color: "success",
        title: "Gửi email thành công",
        message: `Một test mail đã gửi thành công tới ${values.toEmail}.`,
      });
    } else {
      showNotification({
        color: "error",
        title: "Gửi email lỗi",
        message: `Phát sinh lỗi trong khi gửi email tới ${
          values.toEmail
        }. Hãy kiểm tra browser console log để biết thêm thông tin. ${result.meta?.exception || result.message}`,
      });
    }
    console.log("#handleSubmitFormik: result=", result);
    formikHelpers.setSubmitting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { values, touched, errors, isSubmitting, handleChange, handleSubmit, setFieldValue } = useFormik<TestEmailForm>(
    {
      initialValues: initialFormValues,
      validationSchema: testEmailFormValidationSchema,
      onSubmit: handleSubmitFormik,
    }
  );

  const handleTypeChange = useCallback(
    (value: string) => {
      setFieldValue("type", value);
      const type = value as EmailTemplateType;
      switch (type) {
        case EmailTemplateType.VERIFICATION_CODE:
          setFieldValue(
            "data",
            JSON.stringify(
              {
                code: randomString(6, true),
                minutes: FORGOT_PASSWORD_EXPIRATION_SECONDS / 60,
              },
              null,
              2
            )
          );
          break;
        case EmailTemplateType.ACCOUNT_ACTIVATION:
          setFieldValue(
            "data",
            JSON.stringify(
              {
                fullName: "Your Full Name",
                email: "your-email@example.com",
                phoneNumber: "+80123456789",
                activationLink:
                  "http://localhost:3000/auth/signup/activation?token=8cea098f-f8ac-4414-b813-2acf754c31e3",
              },
              null,
              2
            )
          );
          break;
        case EmailTemplateType.WELCOME:
          setFieldValue(
            "data",
            JSON.stringify(
              {
                loginLink: "http://localhost:3000/auth/signin",
              },
              null,
              2
            )
          );
          break;
        case EmailTemplateType.ADMIN_NEW_ORGANIZATION:
          setFieldValue(
            "data",
            JSON.stringify(
              {
                organizationName: "Công ty cổ phần giả pháp Không Gian Xanh",
                userName: "nghia.tong",
                taxCode: "0123456789",
                businessAddress: "BS9, Diamond Riverside, 1646A Võ Văn Kiệt, Phường 16, Quận 8, Tp.HCM, Việt Nam",
                contactName: "Trần Thanh Phong",
                contactEmail: "phong.tran@gss-sol.com",
                contactPhoneNumber: "0923456789",
                fullName: "Trần Thanh Phong",
                email: "phong.tran@gss-sol.com",
                phoneNumber: "0923456789",
              },
              null,
              2
            )
          );
          break;
        case EmailTemplateType.USER_NEW_ORGANIZATION:
          setFieldValue(
            "data",
            JSON.stringify(
              {
                userName: "Trầm Minh Nhựt",
                organizationName: "Công ty cổ phần TMN",
                taxCode: "0123456789",
                email: "nhut.tram@gss-sol.com",
                phoneNumber: "0923456789",
                businessAddress: "BS9, Diamond Riverside, 1646A Võ Văn Kiệt, Phường 16, Quận 8, Tp.HCM, Việt Nam",
                contactName: "Trần Thanh Phong",
                contactEmail: "phong.tran@gss-sol.com",
                contactPhoneNumber: "0923456789",
                autoActivateOrganization: "true",
                systemLink: "https://develop.autotms.vn/auth/signin",
              },
              null,
              2
            )
          );
          break;
        default:
          setFieldValue("data", "{}");
          break;
      }
    },
    [setFieldValue]
  );

  const actionComponent = useMemo(
    () => (
      <div className="flex flex-row justify-end gap-x-4">
        <Button type="submit" loading={isSubmitting}>
          Send test mail
        </Button>
      </div>
    ),
    [isSubmitting]
  );

  return (
    <form method="POST" onSubmit={handleSubmit}>
      <PageHeader title="Send test email" actionHorizontal actionComponent={actionComponent} />

      <div className="space-y-12">
        <InputGroup
          title="Thông tin mail test"
          description="Nhập các thông tin người nhận, loại email, ngôn ngữ,... sau đó bấm nút Send test email để tiến hành gửi test email."
        >
          <div className="col-span-full">
            <TextField
              label="Người nhận"
              name="toEmail"
              value={values.toEmail}
              required
              maxLength={255}
              onChange={handleChange}
              helperText="Nếu nhiều người nhận thì nhập cách nhau bằng dấu chấm phẩy [ ; ]"
              errorText={touched.toEmail && errors.toEmail}
            />
          </div>

          <div className="sm:col-span-3">
            <Select
              label="Loại email"
              name="type"
              items={EMAIL_TYPE_OPTIONS}
              value={values.type}
              onChange={handleTypeChange}
            />
          </div>

          <div className="sm:col-span-2">
            <Select
              label="Ngôn ngữ"
              name="locale"
              items={LOCALE_OPTIONS}
              value={values.locale}
              onChange={(value) => setFieldValue("locale", value)}
            />
          </div>

          <div className="col-span-full">
            <TextField
              label="JSON data"
              name="data"
              value={values.data}
              multiline
              rows={10}
              onChange={handleChange}
              helperText="Sử dụng để cấu hình tham số của nội dung email theo Loại email tương ứng."
              errorText={touched.data && errors.data}
            />
          </div>
        </InputGroup>
      </div>

      <div className="mt-4 max-sm:px-4">{actionComponent}</div>
    </form>
  );
}
