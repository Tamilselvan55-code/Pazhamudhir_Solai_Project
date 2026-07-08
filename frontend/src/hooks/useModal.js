import { useContext } from 'react';
import { ModalContext } from '../components/Modal/ModalProvider';

const useModal = () => useContext(ModalContext);
export default useModal;
