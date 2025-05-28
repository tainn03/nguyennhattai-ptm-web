"use client";

import { useState } from "react";

import { ModalActions, ModalContent, ModalHeader } from "@/components/atoms";
import { ModalActionsProps } from "@/components/atoms/ModalActions/ModalActions";
import { Button, Modal, PageHeader } from "@/components/molecules";
import { AlertModal, ConfirmModal } from "@/components/organisms";

export default function Page() {
  const [open1, setOpen1] = useState(false);
  const [open2, setOpen2] = useState(false);
  const [open3, setOpen3] = useState(false);
  const [open4, setOpen4] = useState(false);
  const [open5, setOpen5] = useState(false);
  const [open5Align, setOpen5Align] = useState<ModalActionsProps["align"]>("right");
  const [open6, setOpen6] = useState(false);

  const [openAlert1, setOpenAlert1] = useState(false);
  const [openAlert2, setOpenAlert2] = useState(false);

  const [openConfirm1, setOpenConfirm1] = useState(false);
  const [openConfirm2, setOpenConfirm2] = useState(false);

  return (
    <div>
      <PageHeader title="Modal component" />

      <div className="mt-10 flex flex-col gap-x-4 gap-y-6">
        <div className="flex flex-col gap-y-4">
          <h2 className="font-semibold text-gray-900">Modal common</h2>
          <div className="space-x-6">
            <div className="flex flex-row flex-wrap gap-4">
              <Button variant="contained" onClick={() => setOpen1(true)}>
                Close when click outside
              </Button>
              <Button variant="contained" onClick={() => setOpen2(true)}>
                showCloseButton
              </Button>
              <Button variant="contained" onClick={() => setOpen3(true)}>
                With sub title
              </Button>
              <Button variant="contained" onClick={() => setOpen4(true)}>
                With action header
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  setOpen5Align("right");
                  setOpen5(true);
                }}
              >
                With action footer (default, action=right)
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  setOpen5Align("left");
                  setOpen5(true);
                }}
              >
                With action footer (action=left)
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  setOpen5Align("center");
                  setOpen5(true);
                }}
              >
                With action footer (action=center)
              </Button>

              <Button variant="contained" onClick={() => setOpen6(true)}>
                No divider
              </Button>
            </div>
          </div>
        </div>

        <Modal open={open1} onDismiss={() => setOpen1(false)}>
          <ModalHeader title="Click bên ngoài để đóng modal" />
          <ModalContent>
            <p className="text-sm text-gray-500">
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Eius aliquam laudantium explicabo pariatur iste
              dolorem animi vitae error totam. At sapiente aliquam accusamus facere veritatis.
            </p>
          </ModalContent>
        </Modal>

        <Modal open={open2} showCloseButton onClose={() => setOpen2(false)}>
          <ModalHeader title="Click button close để đóng modal" />
          <ModalContent>
            <p className="text-sm text-gray-500">
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Eius aliquam laudantium explicabo pariatur iste
              dolorem animi vitae error totam. At sapiente aliquam accusamus facere veritatis.
            </p>
          </ModalContent>
        </Modal>

        <Modal open={open3} showCloseButton onClose={() => setOpen3(false)} onDismiss={() => setOpen3(false)}>
          <ModalHeader title="With sub title" subTitle="This is a sub title" />
          <ModalContent>
            <p className="text-sm text-gray-500">
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Eius aliquam laudantium explicabo pariatur iste
              dolorem animi vitae error totam. At sapiente aliquam accusamus facere veritatis.
            </p>
          </ModalContent>
        </Modal>

        <Modal open={open4} onDismiss={() => setOpen4(false)}>
          <ModalHeader title="With action in header" actionComponent={<Button size="small">Edit</Button>} />
          <ModalContent>
            <p className="text-sm text-gray-500">
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Eius aliquam laudantium explicabo pariatur iste
              dolorem animi vitae error totam. At sapiente aliquam accusamus facere veritatis.
            </p>
          </ModalContent>
        </Modal>

        <Modal open={open5} onDismiss={() => setOpen5(false)}>
          <ModalHeader title="With action in footer" actionComponent={<Button size="small">Edit</Button>} />
          <ModalContent>
            <p className="text-sm text-gray-500">
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Eius aliquam laudantium explicabo pariatur iste
              dolorem animi vitae error totam. At sapiente aliquam accusamus facere veritatis.
            </p>
          </ModalContent>
          <ModalActions align={open5Align}>
            <Button variant="outlined" color="secondary" onClick={() => setOpen5(false)}>
              Close
            </Button>
            <Button>Submit</Button>
          </ModalActions>
        </Modal>

        <Modal open={open6} divider={false} onDismiss={() => setOpen6(false)}>
          <ModalHeader title="With action in footer" actionComponent={<Button size="small">Edit</Button>} />
          <ModalContent>
            <p className="text-sm text-gray-500">
              Lorem ipsum, dolor sit amet consectetur adipisicing elit. Eius aliquam laudantium explicabo pariatur iste
              dolorem animi vitae error totam. At sapiente aliquam accusamus facere veritatis.
            </p>
          </ModalContent>
          <ModalActions align={open5Align}>
            <Button variant="outlined" color="secondary" onClick={() => setOpen6(false)}>
              Close
            </Button>
            <Button>Submit</Button>
          </ModalActions>
        </Modal>

        <div className="flex flex-col gap-y-4">
          <h2 className="font-semibold text-gray-900">Alert Modal</h2>
          <div className="space-x-6">
            <div className="flex flex-row flex-wrap gap-4">
              <Button variant="contained" onClick={() => setOpenAlert1(true)}>
                Show alert
              </Button>
              <Button variant="contained" color="error" onClick={() => setOpenAlert2(true)}>
                Show alert (color=error)
              </Button>
            </div>
          </div>
        </div>

        <AlertModal
          icon="success"
          open={openAlert1}
          title="Alert"
          message="This is a message"
          onClose={() => setOpenAlert1(false)}
          onConfirm={() => setOpenAlert1(false)}
        />
        <AlertModal
          icon="error"
          color="error"
          open={openAlert2}
          title="Error"
          message="This is a message"
          onClose={() => setOpenAlert2(false)}
          onConfirm={() => setOpenAlert2(false)}
        />

        <div className="flex flex-col gap-y-4">
          <h2 className="font-semibold text-gray-900">Confirm Modal</h2>
          <div className="space-x-6">
            <div className="flex flex-row flex-wrap gap-4">
              <Button variant="contained" onClick={() => setOpenConfirm1(true)}>
                Show confirm
              </Button>
              <Button variant="contained" color="error" onClick={() => setOpenConfirm2(true)}>
                Show confirm (color=error)
              </Button>
            </div>
          </div>
        </div>

        <ConfirmModal
          icon="warning"
          open={openConfirm1}
          title="Confirm"
          message="This is a message"
          onClose={() => setOpenConfirm1(false)}
          onCancel={() => setOpenConfirm1(false)}
          onConfirm={() => setOpenConfirm1(false)}
        />
        <ConfirmModal
          icon="error"
          color="error"
          open={openConfirm2}
          title="Confirm"
          message="This is a message"
          onClose={() => setOpenConfirm2(false)}
          onCancel={() => setOpenConfirm2(false)}
          onConfirm={() => setOpenConfirm2(false)}
        />
      </div>
    </div>
  );
}
