import * as React from "react";
import type { ToastActionElement } from "./toast.js";
export interface ToastProps {
    id: string;
    title?: React.ReactNode;
    description?: React.ReactNode;
    action?: ToastActionElement;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    variant?: "default" | "destructive";
}
export type ToasterToast = ToastProps & {
    id: string;
    title?: React.ReactNode;
    description?: React.ReactNode;
    action?: ToastActionElement;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};
type Action = {
    type: "ADD_TOAST";
    toast: ToasterToast;
} | {
    type: "UPDATE_TOAST";
    toast: Partial<ToasterToast>;
} | {
    type: "DISMISS_TOAST";
    toastId?: ToasterToast['id'];
} | {
    type: "REMOVE_TOAST";
    toastId?: ToasterToast['id'];
};
export interface State {
    toasts: ToasterToast[];
}
export declare const reducer: (state: State, action: Action) => State;
type Toast = Omit<ToasterToast, "id">;
declare function toast({ ...props }: Toast): {
    id: string;
    dismiss: () => void;
    update: (props: Omit<ToasterToast, "id" | "open" | "onOpenChange">) => void;
};
declare function useToast(): {
    toast: typeof toast;
    dismiss: (toastId?: string) => void;
    toasts: ToasterToast[];
};
export { useToast, toast };
