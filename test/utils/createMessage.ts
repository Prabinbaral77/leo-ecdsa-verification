import { Message } from "../../artifacts/js/types/connection";
import { any2AleoArr } from "./getPaddedAddress";

export const createRandomMessage = (
  sn: number,
  payload: bigint
): Message => {
  // Create a message
  const message: Message = {
    sn: sn,
    payload: payload
  };

  return message;
};
