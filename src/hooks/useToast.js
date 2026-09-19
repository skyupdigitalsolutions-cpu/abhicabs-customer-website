import { useDispatch } from "react-redux";
import { addToast } from "../store/slices/uiSlice";

export function useToast() {
  const dispatch = useDispatch();
  return (message, type) => dispatch(addToast(message, type));
}
