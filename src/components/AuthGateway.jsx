import React, { useState } from 'react';
import {
  KeyRound,
  UserPlus,
  LogIn,
  Copy,
  Check,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import WikithuneIcon from './WikithuneIcon';
import {
  normalizeUserCode,
  isValidUserCode,
  fetchUserAccountByCode,
  generateUniqueUserCode,
  getDefaultProfile,
  syncUserAccountToServer,
  setStoredUserCode,
} from '../services/userStorage';
import { INITIAL_WIKITHUNES } from '../config/rarities';

export default function AuthGateway({ onLoginSuccess }) {
  const [inputCode, setInputCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [newlyCreatedAccount, setNewlyCreatedAccount] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showForgotHelp, setShowForgotHelp] = useState(false);

  // Gère la saisie du code avec formatage WIKI-XXXX-XXXX automatique
  const handleInputChange = (e) => {
    let val = e.target.value.toUpperCase();
    setErrorMessage('');
    // Si l'utilisateur colle sans préfixe
    val = val.replace(/[^A-Z0-9-]/g, '');
    setInputCode(val);
  };

  // Connexion avec un code existant
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const formatted = normalizeUserCode(inputCode);
    if (!isValidUserCode(formatted)) {
      setErrorMessage(
        'Format de code invalide. Exemple attendu : WIKI-4GU5'
      );
      return;
    }

    setIsLoading(true);
    try {
      const account = await fetchUserAccountByCode(formatted);
      if (!account) {
        throw new Error(
          `Aucun compte n'a été trouvé pour le code ${formatted}.`
        );
      }
      setStoredUserCode(formatted);
      onLoginSuccess(account);
    } catch (err) {
      setErrorMessage(
        err.message ||
          `Compte introuvable pour ce code. Vérifiez votre saisie ou générez un nouveau compte ci-dessous.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Génération d'un nouveau compte
  const handleCreateNewAccount = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const freshCode = generateUniqueUserCode();
      const defaultProf = getDefaultProfile(freshCode);
      const newAccount = {
        code: freshCode,
        profile: defaultProf,
        collection: [],
        favorites: [],
        wikithunes: INITIAL_WIKITHUNES,
        stats: { boostersOpened: 0, totalCardsDrawn: 0 },
        createdAt: Date.now(),
      };

      // Sauvegarde serveur et locale
      await syncUserAccountToServer(freshCode, newAccount);
      setStoredUserCode(freshCode);
      setNewlyCreatedAccount(newAccount);
    } catch (err) {
      setErrorMessage(
        "Erreur lors de la création du compte. Veuillez réessayer."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyNewCode = () => {
    if (!newlyCreatedAccount) return;
    navigator.clipboard.writeText(newlyCreatedAccount.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleEnterGame = () => {
    if (newlyCreatedAccount) {
      onLoginSuccess(newlyCreatedAccount);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#202122] flex flex-col justify-between selection:bg-[#3366cc] selection:text-white">
      {/* Header Vector 2022 simplifié */}
      <header className="w-full bg-white border-b border-[#a2a9b1] py-3 px-4 sm:px-8">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://fr.wikipedia.org/static/images/icons/wikipedia.png"
              alt="Logo Wikipédia"
              className="w-10 h-10 object-contain"
            />
            <div>
              <h1 className="wiki-serif text-[20px] font-normal leading-tight text-[#101418] m-0">
                WikiCards
              </h1>
              <p className="text-[12px] text-[#54595d] m-0">
                L'encyclopédie libre que vous pouvez collectionner
              </p>
            </div>
          </div>
          <span className="text-[12px] text-[#72777d] font-mono hidden sm:inline">
            Édition Multijoueur
          </span>
        </div>
      </header>

      {/* Contenu central */}
      <main className="flex-1 flex items-center justify-center p-4 py-10">
        <div className="w-full max-w-[490px] bg-white border border-[#a2a9b1] rounded-[2px] shadow-sm overflow-hidden">
          {/* Bandeau d'en-tête de la boîte */}
          <div className="bg-[#f8f9fa] border-b border-[#eaecf0] px-6 py-4">
            <h2 className="wiki-serif text-[21px] font-normal text-[#101418] m-0">
              {newlyCreatedAccount
                ? 'Votre compte est prêt !'
                : 'Connexion à WikiCards'}
            </h2>
            <p className="text-[13px] text-[#54595d] mt-1 mb-0 leading-[1.4]">
              {newlyCreatedAccount
                ? 'Prenez note de votre code unique avant de commencer.'
                : 'Connectez-vous pour retrouver vos cartes ou créez un nouveau profil.'}
            </p>
          </div>

          <div className="p-6 space-y-6">
            {errorMessage && (
              <div className="p-3 bg-[#ffe9e5] border border-[#f54739] text-[#bf3c2c] rounded-[2px] text-[13px] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* VUE 2 : NOUVEAU COMPTE GÉNÉRÉ */}
            {newlyCreatedAccount ? (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="p-4 bg-[#f8f9fa] border border-[#c8ccd1] rounded-[2px] text-center space-y-3">
                  <span className="text-[12px] text-[#54595d] uppercase font-bold tracking-wider block">
                    Votre Code Unique d'identification
                  </span>
                  <div className="text-[24px] sm:text-[28px] font-mono font-extrabold text-[#101418] tracking-widest selection:bg-[#3366cc]">
                    {newlyCreatedAccount.code}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyNewCode}
                    className="wiki-casino-btn wiki-casino-btn--subtle !min-h-[34px] !py-1 !px-4 !text-[13px] mx-auto"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-4 h-4 text-[#099979]" />
                        <span className="text-[#099979] font-bold">
                          Code copié dans le presse-papier !
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copier mon code</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-3.5 bg-[#dff2eb] border border-[#7fd4b0] rounded-[2px] text-[#103828] text-[12.5px] space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#006b24]" />
                    <span>Important : conservez ce code précieusement</span>
                  </div>
                  <p className="m-0 leading-[1.45]">
                    Ce code vous permettra de vous reconnecter à votre
                    collection sur un autre navigateur, un autre ordinateur ou
                    après avoir effacé vos données.
                  </p>
                </div>

                <div className="flex items-center justify-between text-[13px] bg-[#f8f9fa] p-3 rounded-[2px] border border-[#eaecf0]">
                  <span className="text-[#54595d]">Wikithunes de bienvenue :</span>
                  <div className="font-bold text-[#202122] inline-flex items-center gap-1">
                    <span>
                      {new Intl.NumberFormat('fr-FR').format(INITIAL_WIKITHUNES)}
                    </span>
                    <WikithuneIcon className="w-4 h-4 text-[#3366cc]" />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleEnterGame}
                  className="w-full h-[40px] bg-[#3366cc] hover:bg-[#2a4b8d] active:bg-[#1a3568] text-white font-bold text-[14px] rounded-[2px] cursor-pointer transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  <span>Entrer dans l'encyclopédie</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* VUE 1 : FORMULAIRE DE CONNEXION OU CRÉATION */
              <div className="space-y-6">
                {/* Formulaire de code */}
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="user-code-input"
                      className="block text-[13px] font-bold text-[#202122] mb-1.5"
                    >
                      Code Unique de joueur
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-[#72777d] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="user-code-input"
                        type="text"
                        value={inputCode}
                        onChange={handleInputChange}
                        placeholder="Ex : WIKI-4GU5"
                        maxLength={14}
                        className="w-full h-[38px] pl-9 pr-3 text-[14px] font-mono tracking-wider text-[#202122] bg-white border border-[#a2a9b1] hover:border-[#72777d] rounded-[2px] focus:border-[#3366cc] focus:outline-none focus:shadow-[inset_0_0_0_1px_#3366cc] uppercase transition-colors"
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[11.5px] text-[#72777d]">
                        Entrez votre code pour charger vos cartes et vos Wikithunes.
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowForgotHelp((prev) => !prev)}
                        className="text-[11.5px] text-[#3366cc] hover:underline cursor-pointer shrink-0 ml-2"
                      >
                        Code oublié ?
                      </button>
                    </div>

                    {showForgotHelp && (
                      <div className="mt-2.5 p-3 bg-[#f8f9fa] border border-[#c8ccd1] rounded-[2px] text-[12px] text-[#54595d] space-y-1.5 animate-in fade-in duration-150">
                        <div className="font-bold text-[#202122]">
                          Comment retrouver votre code ?
                        </div>
                        <ul className="list-disc pl-4 space-y-1 m-0">
                          <li>
                            <strong>Sur votre appareil habituel :</strong> si vous ne vous êtes pas déconnecté, votre code est conservé et visible dans l'onglet <em>Profil</em>.
                          </li>
                          <li>
                            <strong>Sur le serveur (vous ou un ami) :</strong> l'administrateur qui héberge le projet peut retrouver votre code dans le dossier <code className="bg-[#eaecf0] px-1 py-0.5 rounded text-[#202122]">data/users/</code> (les fichiers <code className="text-[#202122]">.json</code> contiennent votre pseudo).
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !inputCode.trim()}
                    className="w-full h-[38px] bg-[#3366cc] hover:bg-[#2a4b8d] active:bg-[#1a3568] disabled:bg-[#c8ccd1] text-white font-bold text-[14px] rounded-[2px] cursor-pointer disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>Se connecter</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Séparateur élégant style Wikipédia */}
                <div className="relative flex items-center justify-center">
                  <div className="border-t border-[#eaecf0] w-full" />
                  <span className="bg-white px-3 text-[12px] font-bold text-[#72777d] uppercase tracking-wider shrink-0">
                    OU
                  </span>
                  <div className="border-t border-[#eaecf0] w-full" />
                </div>

                {/* Créer un nouveau compte */}
                <div className="space-y-3">
                  <div className="text-center">
                    <span className="block text-[13px] font-bold text-[#202122]">
                      Vous jouez pour la première fois ?
                    </span>
                    <span className="text-[12px] text-[#54595d] mt-0.5 block">
                      Générez un profil avec {new Intl.NumberFormat('fr-FR').format(INITIAL_WIKITHUNES)} ₩ de départ pour commencer votre collection.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCreateNewAccount}
                    disabled={isLoading}
                    className="w-full h-[38px] bg-[#f8f9fa] hover:bg-[#eaecf0] active:bg-[#dadde3] border border-[#a2a9b1] text-[#202122] font-bold text-[13.5px] rounded-[2px] cursor-pointer transition-colors flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4 text-[#3366cc]" />
                    <span>Créer un nouveau compte</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer Vector 2022 */}
      <footer className="w-full bg-white border-t border-[#eaecf0] py-4 px-4 text-center text-[12px] text-[#72777d]">
        <div className="max-w-[1200px] mx-auto space-y-1">
          <p className="m-0">
            WikiCards est un jeu communautaire et éducatif basé sur les articles et médias libres de Wikipédia FR.
          </p>
          <p className="m-0 text-[11px] text-[#a2a9b1]">
            Les textes sont disponibles sous licence Creative Commons Attribution-ShareAlike 4.0.
          </p>
        </div>
      </footer>
    </div>
  );
}
