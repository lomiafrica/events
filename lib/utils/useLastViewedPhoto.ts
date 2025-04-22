import { createGlobalState } from "react-hooks-global-state";

// Define the type for the initial state
interface InitialState {
  photoToScrollTo: number | null;
}

const initialState: InitialState = { photoToScrollTo: null };
const { useGlobalState } = createGlobalState(initialState);

export const useLastViewedPhoto = () => {
  return useGlobalState("photoToScrollTo");
};
