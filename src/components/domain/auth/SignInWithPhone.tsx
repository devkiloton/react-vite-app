/* eslint-disable no-unused-vars */
import { Dialog, Transition } from '@headlessui/react';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Fragment, useEffect, useState } from 'react';
import { useAuth, useFirestore } from '~/lib/firebase';

// #TODO: It's not DRY. It should be refactored.
export const SignInWithPhone = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [phoneUser, setPhoneUser] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState(0);
  const auth = useAuth();

  useEffect(() => {
    window.recaptchaVerifier = new RecaptchaVerifier(
      auth,
      'recaptcha-container',
      {
        size: 'invisible',
      },
    );

    window.recaptchaVerifier.verify();
  }, []);

  const handleSubmitPhoneNumber = async () => {
    const onlyNumbers = phoneUser.replace(/\D/g, '');
    const phoneNumberBR = `+55${onlyNumbers}`;
    const appVerifier = window.recaptchaVerifier;
    signInWithPhoneNumber(auth, phoneNumberBR, appVerifier).then(
      confirmationResult => {
        window.confirmationResult = confirmationResult;
      },
    );
    setStep(1);
  };

  const handleSubmitCode = async () => {
    const confirmationResult = window.confirmationResult;
    await confirmationResult.confirm(code).then(result => {
      // IMPORTANT: Since Firebase's cloud functions doesn't have authentication triggers when signing in with credentials;
      // the backend can't generate the initial data, as a workaround, the front can take the time diff between the creation
      // time and the current time. If it's less than 30s, it's probably a new user, so I judge that there's no problem in
      // allow a data creation on every login in the first 30s.
      if (
        new Date().getTime() -
          new Date(result.user.metadata.creationTime!).getTime() <
        30000
      ) {
        const firestore = useFirestore();
        // Configuring docs for the new user
        try {
          setDoc(doc(firestore, 'users', result.user.uid), {
            email: result.user.email,
            uid: result.user.uid,
          });

          setDoc(doc(firestore, 'investments', result.user.uid), {
            investedAmount: 0,
            stocks: [],
            crypto: [],
            treasuries: [],
            companyLoans: [],
            cash: [],
          });
        } catch (error) {
          return error;
        }
      }
    });
  };

  const phoneMask = (value: string) => {
    value = value.replace(/\D/g, '');
    value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
    value = value.replace(/(\d)(\d{4})$/, '$1-$2');
    setPhoneUser(value);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        type="button"
        className="btn btn-outline normal-case gap-3  justify-start px-6">
        <svg
          height={24}
          width={24}
          className="fill-current"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24">
          <path d="M21.384,17.752a2.108,2.108,0,0,1-.522,3.359,7.543,7.543,0,0,1-5.476.642C10.5,20.523,3.477,13.5,2.247,8.614a7.543,7.543,0,0,1,.642-5.476,2.108,2.108,0,0,1,3.359-.522L8.333,4.7a2.094,2.094,0,0,1,.445,2.328A3.877,3.877,0,0,1,8,8.2c-2.384,2.384,5.417,10.185,7.8,7.8a3.877,3.877,0,0,1,1.173-.781,2.092,2.092,0,0,1,2.328.445Z" />
        </svg>
        Entrar com telefone
      </button>
      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        className="relative z-[100]">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          <Dialog.Panel className="max-w-120 flex justify-center items-center bg-base-100 w-full overflow-scroll max-h-[90vh] rounded-xl">
            <div className="w-full p-8">
              <Transition
                as={Fragment}
                show={step === 0}
                enter="transform transition duration-[400ms]"
                enterFrom="opacity-0 scale-50"
                enterTo="opacity-100 rotate-0 scale-100"
                leaveFrom="opacity-0 rotate-0 scale-100 "
                leaveTo="opacity-0 rotate-0 scale-95 ">
                <div className="border-none flex flex-col gap-5 h-full items-center justify-center">
                  <div className="flex flex-col gap-2">
                    <h1 className="font-semibold text-lg text-center">
                      Digite seu número de telefone com DDD
                    </h1>
                    <h3 className="leading-4 text-xs text-center">
                      Enviaremos um código via SMS para esse número de celular
                      para que você possa acessar sua conta.
                    </h3>
                  </div>
                  <input
                    type="tel"
                    name="tel"
                    onChange={e => phoneMask(e.target.value)}
                    maxLength={15}
                    pattern="\(\d{2}\)\s*\d{5}-\d{4}"
                    required
                    value={phoneUser}
                    placeholder="(DDD) + Número"
                    className="input input-bordered w-full"
                  />
                  <button
                    type="button"
                    onClick={handleSubmitPhoneNumber}
                    className="btn btn-active btn-primary self-end">
                    Enviar código
                  </button>
                </div>
              </Transition>
              <Transition
                as={Fragment}
                show={step === 1}
                enter="transform transition duration-[400ms]"
                enterFrom="opacity-0 scale-50"
                enterTo="opacity-100 rotate-0 scale-100"
                leaveFrom="opacity-100 rotate-0 scale-100 "
                leaveTo="opacity-0 scale-95 ">
                <div className="border-none flex flex-col gap-5 h-full items-center justify-center">
                  <div className="flex flex-col gap-2">
                    <h1 className="font-semibold text-lg text-center">
                      Digite o código que você recebeu
                    </h1>
                    <h3 className="leading-4 text-xs text-center">
                      Insira o código de 6 dígitos que enviamos via SMS para o
                      número de telefone que você digitou.
                    </h3>
                  </div>
                  <input
                    type="text"
                    name="code"
                    maxLength={6}
                    required
                    onChange={e => setCode(e.target.value)}
                    placeholder="******"
                    className="input input-bordered text-4xl w-40 p-0 text-center font-mono bg-base-300"
                  />
                  <button
                    onClick={handleSubmitCode}
                    className="btn btn-active btn-primary self-end">
                    Confirmar
                  </button>
                </div>
              </Transition>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  );
};
