import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[WikiCards ErrorBoundary caught exception]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetDisplayCache = () => {
    try {
      // Nettoie les caches d'affichage locaux sans toucher au code utilisateur pour ne pas perdre le compte
      const userCode = localStorage.getItem('wikicards_user_code_v1');
      localStorage.removeItem('wikicards_stats_timeline_v1');
      localStorage.removeItem('wikicards_read_notifs_v1');
      localStorage.removeItem('wikicards_dismissed_notifs_v1');
      if (userCode) {
        localStorage.setItem('wikicards_user_code_v1', userCode);
      }
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f8f9fa] text-[#202122] flex flex-col items-center justify-center p-4 selection:bg-[#eaf3ff]">
          <div className="max-w-lg w-full bg-white border border-[#a2a9b1] rounded-sm p-6 shadow-sm">
            {/* En-tête style Wikipédia */}
            <div className="flex items-center gap-3 border-b border-[#eaecf0] pb-4 mb-4">
              <img
                src="https://fr.wikipedia.org/static/images/icons/wikipedia.png"
                alt="Wikipédia"
                className="w-10 h-10 object-contain"
              />
              <div>
                <h1 className="text-[19px] font-serif font-bold text-[#202122] leading-tight">
                  WikiCards - Récupération d'affichage
                </h1>
                <p className="text-[12px] text-[#54595d]">
                  Une anomalie temporaire est survenue dans votre navigateur.
                </p>
              </div>
            </div>

            {/* Message explicatif */}
            <div className="text-[13.5px] text-[#202122] space-y-2 mb-6">
              <p>
                Rassurez-vous : vos <strong>cartes</strong>, votre <strong>solde en Wikithunes</strong> et votre <strong>progression</strong> sont en sécurité sur le serveur.
              </p>
              <p className="text-[12.5px] text-[#54595d]">
                Le redémarrage du conteneur ou une mise en cache temporaire de votre navigateur peut être à l'origine de cet écran blanc.
              </p>
            </div>

            {/* Boutons d'action */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[#eaecf0]">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 px-4 py-2 bg-[#3366cc] hover:bg-[#2a4b8d] text-white text-[13px] font-semibold rounded cursor-pointer transition-colors text-center"
              >
                Recharger la page (F5)
              </button>
              <button
                type="button"
                onClick={this.handleResetDisplayCache}
                className="px-4 py-2 bg-[#f8f9fa] hover:bg-[#eaecf0] text-[#202122] border border-[#a2a9b1] text-[13px] rounded cursor-pointer transition-colors"
                title="Supprime les caches graphiques locaux sans effacer votre compte"
              >
                Nettoyer le cache
              </button>
            </div>

            {/* Détails techniques escamotables */}
            {this.state.error && (
              <details className="mt-4 pt-3 border-t border-[#f0f2f5] text-[11px] text-[#72777d]">
                <summary className="cursor-pointer select-none hover:text-[#202122] font-mono">
                  Détails techniques de l'erreur
                </summary>
                <div className="mt-2 p-2 bg-[#f8f9fa] border border-[#eaecf0] rounded font-mono text-[11px] overflow-auto max-h-40 whitespace-pre-wrap">
                  {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
