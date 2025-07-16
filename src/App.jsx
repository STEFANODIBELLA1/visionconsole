import React from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { 
    getFirestore, doc, getDoc, setDoc, addDoc, deleteDoc, onSnapshot, 
    collection, query, writeBatch, getDocs 
} from 'firebase/firestore';
import { 
    LayoutDashboard, FlaskConical, Contact, Settings, 
    Trash2, PlusCircle, ChevronLeft, X, Send, Calendar, Filter, Download, List, BarChartHorizontal, AlertTriangle, CheckCircle
} from 'lucide-react';

// --- Firebase Configuration ---
// This configuration is provided by the execution environment.
// Using placeholder for local development, will be replaced by __firebase_config in production.
const firebaseConfig = typeof __firebase_config !== 'undefined' 
    ? JSON.parse(__firebase_config)
    : {
        apiKey: "AIzaSyAz1cXMg65gTQa8AoFAJ2Q4esaH-jr5BPQ",
        authDomain: "console-visionottica.firebaseapp.com",
        projectId: "console-visionottica",
        storageBucket: "console-visionottica.firebasestorage.app",
        messagingSenderId: "728377857506",
        appId: "1:728377857506:web:e13fddc017719656a015bb"
      };

// --- Firebase Initialization ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- Firebase Hooks and Helpers ---
const getCollectionRef = (collectionName) => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error("User not authenticated.");
    return collection(db, `artifacts/${appId}/users/${userId}/${collectionName}`);
};

const getDocumentRef = (collectionName, docId) => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error("User not authenticated.");
    return doc(db, `artifacts/${appId}/users/${userId}/${collectionName}`, docId);
};

const addDocument = async (collectionName, data) => await addDoc(getCollectionRef(collectionName), data);
const updateDocument = async (collectionName, id, data) => await setDoc(getDocumentRef(collectionName, id), data, { merge: true });
const setDocument = async (collectionName, id, data) => await setDoc(getDocumentRef(collectionName, id), data);
const deleteDocument = async (collectionName, id) => await deleteDoc(getDocumentRef(collectionName, id));

const useFirestoreCollection = (collectionName) => {
    const [data, setData] = React.useState([]);
    const [userId, setUserId] = React.useState(auth.currentUser?.uid);

    React.useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            setUserId(user ? user.uid : null);
        });
        return () => unsubscribeAuth();
    }, []);

    React.useEffect(() => {
        if (!userId || !collectionName) {
            setData([]);
            return;
        };
        const collectionPath = `artifacts/${appId}/users/${userId}/${collectionName}`;
        const q = query(collection(db, collectionPath));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setData(items);
        }, (error) => console.error(`Error loading collection ${collectionName}:`, error));
        return () => unsubscribe();
    }, [userId, collectionName]);

    return data;
};


// --- Generic UI Components ---
const Modal = ({ isOpen, onClose, title, children, size = 'max-w-lg' }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className={`bg-white rounded-lg shadow-xl p-6 w-full ${size} m-4 transform transition-transform duration-300 animate-fade-in-up`}>
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                    <h4 className="text-xl font-semibold text-gray-800">{title}</h4>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><X size={24} /></button>
                </div>
                <div>{children}</div>
            </div>
        </div>
    );
};

const AlertModal = ({ isOpen, onClose, title, message, type = 'info' }) => {
    if (!isOpen) return null;
    const icons = {
        success: <CheckCircle className="text-green-500" size={32} />,
        error: <AlertTriangle className="text-red-500" size={32} />,
        info: <AlertTriangle className="text-blue-500" size={32} />,
    };
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="flex flex-col items-center text-center">
                {icons[type]}
                <p className="text-gray-700 my-4">{message}</p>
                <Button onClick={onClose} className="bg-blue-500 hover:bg-blue-600">OK</Button>
            </div>
        </Modal>
    );
};

const ConfirmModal = ({ isOpen, onCancel, onConfirm, title, message }) => {
    if (!isOpen) return null;
    return (
        <Modal isOpen={isOpen} onClose={onCancel} title={title}>
            <div className="text-center">
                <p className="text-gray-700 my-4">{message}</p>
                <div className="flex justify-center gap-4 mt-6">
                    <Button onClick={onCancel} className="bg-gray-500 hover:bg-gray-600">Annulla</Button>
                    <Button onClick={onConfirm} className="bg-red-500 hover:bg-red-600">Conferma</Button>
                </div>
            </div>
        </Modal>
    );
};


const Button = ({ onClick, children, className = 'bg-blue-500 hover:bg-blue-600', icon: Icon, type = "button" }) => (
    <button type={type} onClick={onClick} className={`flex items-center justify-center gap-2 px-4 py-2 text-white font-semibold rounded-lg shadow-md transition-transform transform hover:scale-105 ${className}`}>
        {Icon && <Icon size={18} />}
        {children}
    </button>
);

const Input = (props) => <input {...props} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-2" />;
const Select = (props) => <select {...props} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-2" />;


// --- Laboratory Section Components ---
const Laboratorio = ({ vendite, venditori }) => {
    const [subView, setSubView] = React.useState('menu');
    const [consegnaRapida, setConsegnaRapida] = React.useState('');
    const [searchResults, setSearchResults] = React.useState([]);
    const [searchPerformed, setSearchPerformed] = React.useState(false);
    const [detailedResults, setDetailedResults] = React.useState([]);
    const [isStatusModalOpen, setIsStatusModalOpen] = React.useState(false);
    const [selectedVendita, setSelectedVendita] = React.useState(null);

    // State for custom alerts
    const [alertState, setAlertState] = React.useState({ isOpen: false, title: '', message: '', type: 'info' });
    const showAlert = (title, message, type = 'info') => setAlertState({ isOpen: true, title, message, type });

    const handleConsegnaRapida = async (e) => {
        if (e.key === 'Enter') {
            const match = consegnaRapida.match(/^(\d{3})c$/i);
            if (match) {
                const vaschetta = match[1];
                const ordine = vendite.find(v => v.rif_vaschetta === vaschetta && v.stato_ordine !== 'CONSEGNATO');
                if (ordine) {
                    await updateDocument('vendite', ordine.id, { stato_ordine: 'CONSEGNATO' });
                    showAlert('Successo', `Ordine per vaschetta ${vaschetta} (Cliente: ${ordine.cliente}) segnato come CONSEGNATO.`, 'success');
                    setConsegnaRapida('');
                } else {
                    showAlert('Errore', `Nessun ordine attivo trovato per la vaschetta ${vaschetta}.`, 'error');
                }
            }
        }
    };

    const handleSearch = (searchType) => {
        const cliente = document.getElementById('cerca_cliente_stato').value.trim().toLowerCase();
        const vaschetta = document.getElementById('cerca_rif_vaschetta_stato').value.trim();
        const dataInizio = new Date(document.getElementById('data_inizio_ricerca').value);
        if (!cliente && !vaschetta) { 
            showAlert("Attenzione", "Inserisci almeno un criterio di ricerca."); 
            return; 
        }

        const risultati = vendite.filter(v => {
            const vDateParts = v.data.split('/');
            const vDate = new Date(`${vDateParts[2]}-${vDateParts[1]}-${vDateParts[0]}`);
            return vDate >= dataInizio &&
                   (cliente ? v.cliente.toLowerCase().includes(cliente) : true) &&
                   (vaschetta ? v.rif_vaschetta.includes(vaschetta) : true);
        }).sort((a,b) => new Date(b.data.split('/').reverse().join('-')) - new Date(a.data.split('/').reverse().join('-')));

        if (searchType === 'stato') { setSearchResults(risultati); setDetailedResults([]); } 
        else { setDetailedResults(risultati); setSearchResults([]); }
        setSearchPerformed(true);
    };

    const openStatusModal = (vendita) => { setSelectedVendita(vendita); setIsStatusModalOpen(true); };

    const handleUpdateStatus = async (newStatus) => {
        if (selectedVendita) {
            await updateDocument('vendite', selectedVendita.id, { stato_ordine: newStatus });
            setIsStatusModalOpen(false);
            setSelectedVendita(null);
            handleSearch(searchResults.length > 0 ? 'stato' : 'dettagli');
        }
    };

    const renderMenu = () => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button onClick={() => setSubView('carica')} className="bg-green-500 hover:bg-green-600" icon={PlusCircle}>Carica Vendita</Button>
            <Button onClick={() => setSubView('stato')} className="bg-blue-500 hover:bg-blue-600" icon={List}>Stato Occhiale</Button>
            <Button onClick={() => setSubView('elimina')} className="bg-red-500 hover:bg-red-600" icon={Trash2}>Elimina Vendita</Button>
        </div>
    );
    
    const CaricaVenditaForm = () => {
        const handleSubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            if (!data.cliente || !data.stato_ordine || !/^\d{3}$/.test(data.rif_vaschetta) || !/^\d{5}$/.test(data.numero_ordine) || !data.importo) { 
                showAlert("Errore di Compilazione", "Compilare tutti i campi obbligatori correttamente (es. Vaschetta 3 cifre, Ordine 5 cifre).", "error"); 
                return; 
            }
            if (vendite.some(v => v.numero_ordine === data.numero_ordine)) { 
                showAlert("Errore", "Numero ordine già esistente.", "error"); 
                return; 
            }

            const trattamenti = formData.getAll('trattamento');
            const nuovaVendita = { ...data, importo: parseFloat(data.importo), trattamenti, data: new Date().toLocaleDateString('it-IT') };
            await addDocument('vendite', nuovaVendita);
            showAlert('Successo', 'Vendita salvata con successo!', 'success');
            e.target.reset();
            setSubView('menu');
        };
        return (
            <div>
                <h3 className="text-2xl font-semibold mb-4">Carica Vendita</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                         <div><label>Data</label><Input type="text" name="data" readOnly defaultValue={new Date().toLocaleDateString('it-IT')} className="bg-gray-100" /></div>
                         <div><label>Venditore</label><Select name="venditore">{venditori.map(v => <option key={v.id} value={v.nome}>{v.nome}</option>)}</Select></div>
                         <div><label>Tipo Lente</label><Select name="tipo_lente"><option>Monofocale</option><option>Multifocale</option><option>Office</option></Select></div>
                         <div><label>Ordine Lente</label><Select name="ordine_lente"><option>Primo</option><option>Secondo</option></Select></div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div><label>Cognome Cliente</label><Input type="text" name="cliente" required /></div>
                         <div><label>Stato Ordine</label><Select name="stato_ordine" required><option value="DA ORDINARE">DA ORDINARE</option><option value="LENTE ORDINATE">LENTE ORDINATE</option><option value="PRONTO">PRONTO</option><option value="CONSEGNATO">CONSEGNATO</option></Select></div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <div><label>Rif.Vaschetta (3 cifre)</label><Input type="text" name="rif_vaschetta" pattern="\d{3}" maxLength="3" required /></div>
                         <div><label>Numero Ordine (5 cifre)</label><Input type="text" name="numero_ordine" pattern="\d{5}" maxLength="5" required /></div>
                         <div><label>Importo (€)</label><Input type="number" name="importo" step="0.01" min="0" required /></div>
                     </div>
                     <div>
                         <label className="font-semibold">Trattamenti</label>
                         <div className="flex flex-wrap gap-4 mt-2">
                             {['Transition', 'Luce Blu', 'Sun RX', 'SOS'].map(t => (<label key={t} className="flex items-center"><input type="checkbox" name="trattamento" value={t} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mr-2" />{t}</label>))}
                         </div>
                     </div>
                     <div className="flex gap-4 pt-4">
                         <Button type="submit" className="bg-green-500 hover:bg-green-600">Salva Vendita</Button>
                         <Button onClick={() => setSubView('menu')} className="bg-gray-500 hover:bg-gray-600">Annulla</Button>
                     </div>
                </form>
            </div>
        );
    };

    const StatoOcchiale = () => (
        <div>
            <h3 className="text-2xl font-semibold mb-4">Stato Occhiale / Ricerca</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-4 mb-6">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div><label>A partire dalla data</label><Input type="date" id="data_inizio_ricerca" defaultValue={new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().split('T')[0]} /></div>
                     <div><label>Cerca per Cognome</label><Input type="text" id="cerca_cliente_stato" /></div>
                     <div><label>Cerca per Rif.Vaschetta</label><Input type="text" id="cerca_rif_vaschetta_stato" maxLength="3" /></div>
                 </div>
                 <div className="flex gap-4">
                     <Button onClick={() => handleSearch('stato')}>Cerca Stato</Button>
                     <Button onClick={() => handleSearch('dettagli')}>Cerca Dati Completi</Button>
                     <Button onClick={() => { setSearchPerformed(false); setSearchResults([]); setDetailedResults([]); }} className="bg-gray-500 hover:bg-gray-600">Nuova Ricerca</Button>
                 </div>
            </div>
            {searchPerformed && (
                <div className="mt-6">
                    {searchResults.length > 0 && <ul className="space-y-3">{searchResults.map(v => (<li key={v.id} className="bg-white p-4 rounded-lg shadow flex justify-between items-center"><div><p><strong>Cliente:</strong> {v.cliente} - <strong>Data:</strong> {v.data} - <strong>Vaschetta:</strong> {v.rif_vaschetta}</p><p><strong>Stato:</strong> <span className="font-bold">{v.stato_ordine}</span></p></div><Button onClick={() => openStatusModal(v)} className="bg-indigo-500 hover:bg-indigo-600">Modifica Stato</Button></li>))}</ul>}
                    {detailedResults.length > 0 && <div className="space-y-4">{detailedResults.map(v => (<div key={v.id} className="bg-white p-4 rounded-lg shadow"><p><strong>Cliente:</strong> {v.cliente}, <strong>Data:</strong> {v.data}, <strong>Venditore:</strong> {v.venditore}</p><p><strong>N. Ordine:</strong> {v.numero_ordine}, <strong>Vaschetta:</strong> {v.rif_vaschetta}, <strong>Importo:</strong> {(v.importo || 0).toFixed(2)} €</p><p><strong>Stato:</strong> {v.stato_ordine}</p><p><strong>Trattamenti:</strong> {v.trattamenti?.join(', ') || 'Nessuno'}</p></div>))}</div>}
                    {searchResults.length === 0 && detailedResults.length === 0 && <p className="text-center text-gray-500 mt-4">Nessun risultato trovato.</p>}
                </div>
            )}
            <Button onClick={() => setSubView('menu')} className="bg-gray-500 hover:bg-gray-600 mt-6">Torna al menu</Button>
        </div>
    );
    
    const EliminaVendita = () => {
        const [numOrdine, setNumOrdine] = React.useState('');
        const [confirmState, setConfirmState] = React.useState({ isOpen: false, onConfirm: () => {} });

        const handleDeleteRequest = () => {
            if (!/^\d{5}$/.test(numOrdine)) { 
                showAlert("Errore", "Inserisci un Numero Ordine valido (5 cifre).", "error"); 
                return; 
            }
            const venditaDaEliminare = vendite.find(v => v.numero_ordine === numOrdine);
            if (!venditaDaEliminare) { 
                showAlert("Errore", `Nessuna vendita trovata con Numero Ordine ${numOrdine}.`, "error"); 
                return; 
            }
            setConfirmState({
                isOpen: true,
                onConfirm: async () => {
                    await deleteDocument('vendite', venditaDaEliminare.id);
                    showAlert('Successo', `Vendita con Numero Ordine ${numOrdine} eliminata.`, 'success');
                    setNumOrdine('');
                    setSubView('menu');
                    setConfirmState({isOpen: false, onConfirm: () => {}});
                }
            });
        };

        return (
            <div>
                 <ConfirmModal 
                    isOpen={confirmState.isOpen}
                    onCancel={() => setConfirmState({isOpen: false, onConfirm: () => {}})}
                    onConfirm={confirmState.onConfirm}
                    title="Conferma Eliminazione"
                    message={`Sei SICURO di voler eliminare la vendita con Numero Ordine ${numOrdine}? L'azione è irreversibile.`}
                />
                <h3 className="text-2xl font-semibold mb-4">Elimina Vendita</h3>
                <div className="flex items-end gap-4">
                    <div><label>Numero Ordine da eliminare</label><Input type="text" value={numOrdine} onChange={(e) => setNumOrdine(e.target.value)} maxLength="5" /></div>
                    <Button onClick={handleDeleteRequest} className="bg-red-500 hover:bg-red-600">Conferma Eliminazione</Button>
                </div>
                <Button onClick={() => setSubView('menu')} className="bg-gray-500 hover:bg-gray-600 mt-6">Torna al menu</Button>
            </div>
        );
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <AlertModal {...alertState} onClose={() => setAlertState({ ...alertState, isOpen: false })} />
            <div className="flex justify-between items-center border-b pb-4 mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Laboratorio</h2>
                <div className="bg-blue-50 p-3 rounded-lg flex items-center gap-3">
                    <label className="font-semibold text-blue-800">Consegna Rapida:</label>
                    <Input type="text" placeholder="Es. 123c + Invio" value={consegnaRapida} onChange={(e) => setConsegnaRapida(e.target.value)} onKeyDown={handleConsegnaRapida} className="p-2 rounded-md border-blue-200 shadow-sm" />
                </div>
            </div>
            {subView === 'menu' && renderMenu()}
            {subView === 'carica' && <CaricaVenditaForm />}
            {subView === 'stato' && <StatoOcchiale />}
            {subView === 'elimina' && <EliminaVendita />}
            <Modal isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} title={`Modifica Stato Ordine N. ${selectedVendita?.numero_ordine}`}>
                <div className="grid grid-cols-2 gap-3">
                    {['DA ORDINARE', 'LENTE ORDINATE', 'PRONTO', 'CONSEGNATO'].map(status => (<Button key={status} onClick={() => handleUpdateStatus(status)}>{status}</Button>))}
                </div>
            </Modal>
        </div>
    );
};

// --- Administration Section Components ---
const Amministrazione = ({ venditori, emailAmministrazioni, vendite }) => {
    const [subView, setSubView] = React.useState('menu');
    
    const renderMenu = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button onClick={() => setSubView('datiMensili')} icon={Calendar}>Dati Mensili</Button>
            <Button onClick={() => setSubView('elenchi')} icon={List}>Elenchi</Button>
            <Button onClick={() => setSubView('gestioneDati')} icon={Settings}>Gestione Dati</Button>
            <Button onClick={() => setSubView('statistiche')} icon={BarChartHorizontal}>Statistiche Vendite</Button>
            <Button onClick={() => setSubView('chiusura')} icon={Send}>Invio Chiusura Giornaliera</Button>
            <Button onClick={() => setSubView('pdf')} icon={Filter}>Filtra e Scarica WO (PDF)</Button>
        </div>
    );
    
    const renderSubView = () => {
        switch(subView) {
            case 'datiMensili': return <DatiMensili />;
            case 'elenchi': return <Elenchi venditori={venditori} emailAmministrazioni={emailAmministrazioni} />;
            case 'gestioneDati': return <GestioneDati />;
            case 'statistiche': return <StatisticheVendite vendite={vendite} />;
            case 'chiusura': return <InvioChiusura vendite={vendite} emailAmministrazioni={emailAmministrazioni} onClose={() => setSubView('menu')} />;
            case 'pdf': return <FiltraPdf vendite={vendite} venditori={venditori} onClose={() => setSubView('menu')} />;
            default: return <p>Sezione non trovata.</p>;
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-3xl font-bold text-gray-800 border-b pb-4 mb-6">Amministrazione</h2>
            {subView === 'menu' ? renderMenu() : (
                <div>
                    <Button onClick={() => setSubView('menu')} className="mb-6 bg-gray-500 hover:bg-gray-600" icon={ChevronLeft}>Torna al menu Amministrazione</Button>
                    {renderSubView()}
                </div>
            )}
        </div>
    );
};

const DatiMensili = () => {
    const [datiMensili, setDatiMensili] = React.useState({});
    const [periodo, setPeriodo] = React.useState(new Date().toISOString().slice(0, 7));
    const [messaggio, setMessaggio] = React.useState('');
    const fileInputRef = React.useRef(null);
    const [isLoading, setIsLoading] = React.useState(false);

    React.useEffect(() => {
        if (!periodo || !auth.currentUser) return;
        setIsLoading(true);
        const docRef = doc(db, `artifacts/${appId}/users/${auth.currentUser.uid}/datiMensili`, periodo);
        const unsub = onSnapshot(docRef, (doc) => {
            setDatiMensili(doc.exists() ? doc.data() : {});
            setIsLoading(false);
        }, (err) => {
            console.error(err);
            setMessaggio(`Errore nel caricamento dati: ${err.message}`);
            setIsLoading(false);
        });
        return () => unsub();
    }, [periodo]);

    const handleFileProcess = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setMessaggio('Elaborazione file...');
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                // XLSX is expected to be available on the window object
                if (!window.XLSX) {
                    throw new Error("La libreria per la lettura dei file Excel (XLSX) non è disponibile.");
                }
                const workbook = window.XLSX.read(event.target.result, { type: 'binary' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const sheetData = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
                
                let dataStartRowIndex = -1;
                for (let i = 0; i < sheetData.length; i++) {
                    if (sheetData[i] && String(sheetData[i][3]).trim().toLowerCase() === 'saldato tgt') {
                        dataStartRowIndex = i;
                        break;
                    }
                }
                if (dataStartRowIndex === -1) throw new Error('Riga "Saldato TGT" non trovata nella colonna D del file Excel.');

                const numDaysInMonth = new Date(periodo.split('-')[0], periodo.split('-')[1], 0).getDate();
                const dateHeaders = Array.from({ length: numDaysInMonth }, (_, i) => `${String(i + 1).padStart(2, '0')}/${periodo.slice(5, 7)}/${periodo.slice(0, 4)}`);
                const metrics = [];
                for (let i = dataStartRowIndex; i <= dataStartRowIndex + 15 && i < sheetData.length; i++) {
                    const row = sheetData[i] || [];
                    const metricName = String(row[3] || "").trim();
                    if (metricName && metricName.toLowerCase() !== "area") {
                        const values = row.slice(4, 4 + numDaysInMonth);
                        metrics.push({ name: metricName, values });
                    }
                }

                const parsedData = { period: periodo, dateHeaders, metrics };
                await setDocument('datiMensili', periodo, parsedData);
                setMessaggio('File elaborato e salvato con successo.');
            } catch (err) {
                setMessaggio(`Errore: ${err.message}`);
                console.error(err);
            }
        };
        reader.readAsBinaryString(file);
    };

    return (
        <div>
            <h3 className="text-2xl font-semibold mb-4">Dati Mensili</h3>
            <div className="flex items-center gap-4 mb-4 bg-gray-50 p-4 rounded-lg">
                <Input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)} />
                <Input type="file" accept=".xlsx,.xls" ref={fileInputRef} onChange={handleFileProcess} />
            </div>
            {messaggio && <p className="text-center my-2 p-2 bg-yellow-100 rounded-md">{messaggio}</p>}
            <div className="overflow-x-auto">
                {isLoading ? <p>Caricamento dati...</p> : datiMensili.metrics ? (
                    <table className="min-w-full bg-white border text-sm">
                        <thead className="sticky top-0 bg-gray-100 z-10">
                            <tr>
                                <th className="py-2 px-3 border-b border-r font-semibold sticky left-0 bg-gray-100">Metrica</th>
                                {datiMensili.dateHeaders.map(h => <th key={h} className="py-2 px-3 border-b">{h.split('/')[0]}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {datiMensili.metrics.map(m => (
                                <tr key={m.name} className="hover:bg-gray-50">
                                    <td className="py-2 px-3 border-b border-r font-semibold sticky left-0 bg-white hover:bg-gray-50">{m.name}</td>
                                    {m.values.map((v, i) => <td key={i} className="py-2 px-3 border-b text-right">{typeof v === 'number' ? v.toFixed(2) : v}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : <p className="text-gray-500 p-4 text-center">Nessun dato per il periodo selezionato. Carica un file.</p>}
            </div>
        </div>
    );
};

const GestioneDati = () => {
    const [alertState, setAlertState] = React.useState({ isOpen: false, title: '', message: '', type: 'info' });
    const showAlert = (title, message, type = 'info') => setAlertState({ isOpen: true, title, message, type });
    const [confirmState, setConfirmState] = React.useState({ isOpen: false, message: '', onConfirm: () => {} });

    const handleExport = async () => {
        setConfirmState({
            isOpen: true,
            message: "Vuoi esportare tutti i dati in un file JSON?",
            onConfirm: async () => {
                const collectionsToExport = ['vendite', 'venditori', 'emailAmministrazioni', 'datiMensili'];
                const backupData = {};
                try {
                    for (const coll of collectionsToExport) {
                        const snapshot = await getDocs(getCollectionRef(coll));
                        backupData[coll] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    }
                    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `backup_gestionale_${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    showAlert("Successo", "Backup esportato con successo!", 'success');
                } catch (err) {
                    showAlert("Errore", "Errore durante l'esportazione.", 'error');
                    console.error(err);
                } finally {
                    setConfirmState({ isOpen: false, message: '', onConfirm: () => {} });
                }
            }
        });
    };

    const handleImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setConfirmState({
            isOpen: true,
            message: "ATTENZIONE: L'importazione sovrascriverà TUTTI i dati esistenti. Questa azione è irreversibile. Continuare?",
            onConfirm: () => {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    try {
                        const data = JSON.parse(event.target.result);
                        const batch = writeBatch(db);
                        const collectionsInBackup = Object.keys(data);
                        
                        for (const collName of collectionsInBackup) {
                            const oldDocsSnapshot = await getDocs(getCollectionRef(collName));
                            oldDocsSnapshot.forEach(doc => batch.delete(doc.ref));
                        }
                        await batch.commit();
                        
                        const newBatch = writeBatch(db);
                        for (const collName in data) {
                            data[collName].forEach(item => {
                                const { id, ...itemData } = item;
                                const docRef = getDocumentRef(collName, id);
                                newBatch.set(docRef, itemData);
                            });
                        }
                        await newBatch.commit();
                        showAlert("Successo", "Dati importati con successo! La pagina si ricaricherà.", 'success');
                        setTimeout(() => window.location.reload(), 2000);
                    } catch (err) {
                        showAlert("Errore", "Errore durante l'importazione. Controlla il file e la console.", 'error');
                        console.error(err);
                    } finally {
                         setConfirmState({ isOpen: false, message: '', onConfirm: () => {} });
                    }
                };
                reader.readAsText(file);
            }
        });
        e.target.value = null; // Reset file input
    };

    return (
        <div>
            <AlertModal {...alertState} onClose={() => setAlertState({ ...alertState, isOpen: false })} />
            <ConfirmModal 
                isOpen={confirmState.isOpen}
                onCancel={() => setConfirmState({ isOpen: false, message: '', onConfirm: () => {} })}
                onConfirm={confirmState.onConfirm}
                title="Conferma Operazione"
                message={confirmState.message}
            />
            <h3 className="text-2xl font-semibold mb-4">Gestione Dati</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-bold mb-2">Esporta Dati</h4>
                    <p className="text-sm mb-4">Crea un backup completo di tutti i dati in un file JSON.</p>
                    <Button onClick={handleExport} icon={Download}>Esporta Backup</Button>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-bold mb-2">Importa Dati</h4>
                    <p className="text-sm mb-4">Ripristina i dati da un file di backup. Attenzione: operazione irreversibile.</p>
                    <Input type="file" accept=".json" onChange={handleImport} />
                </div>
            </div>
        </div>
    );
};

const StatisticheVendite = ({ vendite }) => {
    const stats = React.useMemo(() => {
        const oggi = new Date();
        const meseCorrente = oggi.getMonth();
        const annoCorrente = oggi.getFullYear();
        
        const venditeMese = vendite.filter(v => {
            if (!v.data) return false;
            const [day, month, year] = v.data.split('/');
            const vDate = new Date(`${year}-${month}-${day}`);
            return vDate.getMonth() === meseCorrente && vDate.getFullYear() === annoCorrente;
        });

        const venditeOggi = venditeMese.filter(v => new Date(v.data.split('/').reverse().join('-')).getDate() === oggi.getDate());

        const calcStats = (data) => data.reduce((acc, v) => {
            const importo = v.importo || 0;
            acc.totale += importo;
            acc.venditori[v.venditore] = (acc.venditori[v.venditore] || 0) + importo;
            if (v.ordine_lente === 'Primo') acc.primiOrdini++; else acc.secondiOrdini++;
            acc.tipiLente[v.tipo_lente] = (acc.tipiLente[v.tipo_lente] || 0) + 1;
            return acc;
        }, { totale: 0, venditori: {}, primiOrdini: 0, secondiOrdini: 0, tipiLente: { Monofocale: 0, Multifocale: 0, Office: 0 } });

        return { oggi: calcStats(venditeOggi), mese: calcStats(venditeMese), nomeMese: oggi.toLocaleString('it-IT', { month: 'long' }) };
    }, [vendite]);

    const StatCard = ({ title, children }) => <div className="bg-gray-50 p-4 rounded-lg shadow-sm"><h4 className="font-bold text-lg text-blue-700 border-b pb-2 mb-2">{title}</h4><div className="space-y-1 text-sm">{children}</div></div>;

    return (
        <div>
            <h3 className="text-2xl font-semibold mb-4">Statistiche Vendite</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard title="Totali Generali"><p><strong>Oggi:</strong> {stats.oggi.totale.toFixed(2)} €</p><p><strong>Mese ({stats.nomeMese}):</strong> {stats.mese.totale.toFixed(2)} €</p></StatCard>
                <StatCard title="Vendite per Venditore (Oggi)">{Object.entries(stats.oggi.venditori).map(([nome, tot]) => <p key={nome}><strong>{nome}:</strong> {tot.toFixed(2)} €</p>)}</StatCard>
                <StatCard title="Vendite per Venditore (Mese)">{Object.entries(stats.mese.venditori).map(([nome, tot]) => <p key={nome}><strong>{nome}:</strong> {tot.toFixed(2)} €</p>)}</StatCard>
                <StatCard title="Tipo Ordine Lente"><p><strong>Oggi:</strong> {stats.oggi.primiOrdini} Primi / {stats.oggi.secondiOrdini} Secondi</p><p><strong>Mese:</strong> {stats.mese.primiOrdini} Primi / {stats.mese.secondiOrdini} Secondi</p></StatCard>
                <StatCard title="Tipo Lenti Vendute (Oggi)">{Object.entries(stats.oggi.tipiLente).map(([tipo, qta]) => <p key={tipo}><strong>{tipo}:</strong> {qta}</p>)}</StatCard>
                <StatCard title="Tipo Lenti Vendute (Mese)">{Object.entries(stats.mese.tipiLente).map(([tipo, qta]) => <p key={tipo}><strong>{tipo}:</strong> {qta}</p>)}</StatCard>
            </div>
        </div>
    );
};

const InvioChiusura = ({ vendite, emailAmministrazioni, onClose }) => {
    const [selectedEmails, setSelectedEmails] = React.useState([]);
    const [alertState, setAlertState] = React.useState({ isOpen: false, title: '', message: '' });

    const datiOggi = React.useMemo(() => {
        const oggi = new Date();
        const venditeOggi = vendite.filter(v => {
            if (!v.data) return false;
            const [day, month, year] = v.data.split('/');
            return new Date(`${year}-${month}-${day}`).toDateString() === oggi.toDateString();
        });
        return venditeOggi.reduce((acc, v) => {
            acc.totaleWO += v.importo || 0;
            if (v.ordine_lente === 'Primo') acc.primiOrdini++;
            else acc.secondiOrdini++;
            return acc;
        }, { totaleWO: 0, primiOrdini: 0, secondiOrdini: 0 });
    }, [vendite]);

    const handleSend = (e) => {
        e.preventDefault();
        if (selectedEmails.length === 0) {
            setAlertState({isOpen: true, title: "Attenzione", message: "Seleziona almeno un destinatario."});
            return;
        }
        const formData = new FormData(e.target);
        const fatturato = formData.get('fatturato');
        const pacchetti = formData.get('pacchetti');
        const sole = formData.get('sole');
        const valoreSole = formData.get('valoreSole');

        let body = `Report di chiusura per la giornata del ${new Date().toLocaleDateString('it-IT')}:\n\n`;
        body += `RIEPILOGO DATI GIORNALIERI:\n`;
        body += `  - Totale Fatturato (da Cassa): ${parseFloat(fatturato || 0).toFixed(2)} €\n`;
        body += `  - Totale Commissionato (WO): ${datiOggi.totaleWO.toFixed(2)} €\n`;
        body += `    - Primi: ${datiOggi.primiOrdini}\n`;
        body += `    - Secondi: ${datiOggi.secondiOrdini}\n`;
        body += `  - N. Pacchetti LAC: ${pacchetti || 0}\n`;
        body += `  - Occhiali da Sole Venduti: ${sole || 0}\n`;
        body += `  - Valore Occhiali da Sole: ${parseFloat(valoreSole || 0).toFixed(2)} €\n\n`;
        body += `Cordiali Saluti,\nIl Sistema Gestionale`;

        const mailtoLink = `mailto:${selectedEmails.join(',')}?subject=Report Chiusura Giornaliera&body=${encodeURIComponent(body)}`;
        window.open(mailtoLink, '_blank');
        setAlertState({isOpen: true, title: "Email Pronta", message: "Il client di posta è stato aperto per inviare il report."});
        onClose();
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Invio Report Chiusura Giornaliera" size="max-w-2xl">
            <AlertModal {...alertState} onClose={() => setAlertState({ ...alertState, isOpen: false })} />
            <form onSubmit={handleSend}>
                <div className="mb-4">
                    <label className="font-bold">1. Seleziona Destinatari</label>
                    <div className="p-2 border rounded-md mt-2 max-h-32 overflow-y-auto">
                        {emailAmministrazioni.map(e => (
                            <label key={e.id} className="flex items-center p-1">
                                <input type="checkbox" value={e.email} onChange={(evt) => {
                                    if (evt.target.checked) setSelectedEmails([...selectedEmails, e.email]);
                                    else setSelectedEmails(selectedEmails.filter(em => em !== e.email));
                                }} className="mr-2" />
                                {e.nomeContatto} ({e.email})
                            </label>
                        ))}
                    </div>
                </div>
                <div className="mb-4">
                    <strong className="font-bold">2. Dati Calcolati (Oggi)</strong>
                    <div className="grid grid-cols-3 gap-4 p-2 bg-gray-50 rounded-md mt-2">
                        <p><strong>Totale WO:</strong> {datiOggi.totaleWO.toFixed(2)} €</p>
                        <p><strong>Primi:</strong> {datiOggi.primiOrdini}</p>
                        <p><strong>Secondi:</strong> {datiOggi.secondiOrdini}</p>
                    </div>
                </div>
                <div className="mb-4">
                    <strong className="font-bold">3. Inserisci Totali Manuali</strong>
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                         <div><label>Fatturato Cassa (€)</label><Input type="number" name="fatturato" step="0.01" required/></div>
                         <div><label>N. Pacchetti LAC</label><Input type="number" name="pacchetti" /></div>
                         <div><label>N. Occhiali Sole</label><Input type="number" name="sole" /></div>
                         <div><label>Valore Sole (€)</label><Input type="number" name="valoreSole" step="0.01" /></div>
                     </div>
                </div>
                <div className="flex justify-end gap-4">
                    <Button type="button" onClick={onClose} className="bg-gray-500 hover:bg-gray-600">Annulla</Button>
                    <Button type="submit" icon={Send}>Prepara Email</Button>
                </div>
            </form>
        </Modal>
    );
};

const FiltraPdf = ({ vendite, venditori, onClose }) => {
    const [alertState, setAlertState] = React.useState({ isOpen: false, title: '', message: '' });

    const handleGeneratePdf = (e) => {
        e.preventDefault();
        // jspdf and jspdf-autotable are expected to be on the window object
        if (!window.jspdf || !window.jspdf.jsPDF) {
            setAlertState({isOpen: true, title: "Errore", message: "La libreria per la generazione di PDF (jsPDF) non è disponibile."});
            return;
        }

        const formData = new FormData(e.target);
        const filters = Object.fromEntries(formData.entries());
        const stati = formData.getAll('stato_ordine');

        const filteredVendite = vendite.filter(v => {
            if (!v.data) return false;
            const vDate = new Date(v.data.split('/').reverse().join('-'));
            const startDate = new Date(filters.startDate);
            const endDate = new Date(filters.endDate);
            endDate.setHours(23, 59, 59, 999);

            return vDate >= startDate && vDate <= endDate &&
                   (!filters.venditore || v.venditore === filters.venditore) &&
                   (!filters.tipo_lente || v.tipo_lente === filters.tipo_lente) &&
                   (!filters.ordine_lente || v.ordine_lente === filters.ordine_lente) &&
                   (!filters.trattamento || (v.trattamenti && v.trattamenti.includes(filters.trattamento))) &&
                   (stati.length === 0 || stati.includes(v.stato_ordine));
        });

        if (filteredVendite.length === 0) {
            setAlertState({isOpen: true, title: "Nessun Risultato", message: "Nessuna vendita trovata per i filtri selezionati."});
            return;
        }

        const doc = new window.jspdf.jsPDF({ orientation: 'landscape' });
        doc.text(`Report Vendite Filtrato`, 14, 16);
        const body = filteredVendite.map(v => [
            v.data, v.cliente, v.venditore, v.tipo_lente, v.ordine_lente, v.rif_vaschetta, v.numero_ordine, v.stato_ordine, (v.importo || 0).toFixed(2), (v.trattamenti || []).join(', ')
        ]);
        doc.autoTable({
            head: [['Data', 'Cliente', 'Venditore', 'Tipo Lente', 'Ordine Lente', 'Rif.Vaschetta', 'N. Ordine', 'Stato', 'Importo (€)', 'Trattamenti']],
            body: body,
            startY: 20,
            theme: 'striped',
            styles: { fontSize: 7 }
        });
        doc.save(`Report_WO_Filtrato_${new Date().toISOString().slice(0, 10)}.pdf`);
        onClose();
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Filtra e Scarica Elenco WO" size="max-w-3xl">
             <AlertModal {...alertState} onClose={() => setAlertState({ ...alertState, isOpen: false })} />
            <form onSubmit={handleGeneratePdf}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div><label>Data Inizio</label><Input type="date" name="startDate" defaultValue={new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0]} required /></div>
                    <div><label>Data Fine</label><Input type="date" name="endDate" defaultValue={new Date().toISOString().split('T')[0]} required /></div>
                    <div><label>Venditore</label><Select name="venditore"><option value="">Tutti</option>{venditori.map(v => <option key={v.id} value={v.nome}>{v.nome}</option>)}</Select></div>
                    <div><label>Tipo Lente</label><Select name="tipo_lente"><option value="">Tutti</option><option>Monofocale</option><option>Multifocale</option><option>Office</option></Select></div>
                    <div><label>Ordine Lente</label><Select name="ordine_lente"><option value="">Tutti</option><option>Primo</option><option>Secondo</option></Select></div>
                    <div><label>Trattamento</label><Select name="trattamento"><option value="">Tutti</option><option>Transition</option><option>Luce Blu</option><option>Sun RX</option><option>SOS</option></Select></div>
                </div>
                <div className="mb-4">
                    <label>Stato Ordine</label>
                    <div className="flex flex-wrap gap-4 mt-2">
                        {['DA ORDINARE', 'LENTE ORDINATE', 'PRONTO', 'CONSEGNATO'].map(s => <label key={s} className="flex items-center"><input type="checkbox" name="stato_ordine" value={s} className="mr-2"/>{s}</label>)}
                    </div>
                </div>
                <div className="flex justify-end gap-4">
                    <Button type="button" onClick={onClose} className="bg-gray-500 hover:bg-gray-600">Annulla</Button>
                    <Button type="submit" icon={Download}>Genera PDF</Button>
                </div>
            </form>
        </Modal>
    );
};

const Elenchi = ({ venditori, emailAmministrazioni }) => {
    const [nuovoVenditore, setNuovoVenditore] = React.useState('');
    const [nuovaEmailNome, setNuovaEmailNome] = React.useState('');
    const [nuovaEmailAddr, setNuovaEmailAddr] = React.useState('');

    const [alertState, setAlertState] = React.useState({ isOpen: false, title: '', message: '', type: 'info' });
    const showAlert = (title, message, type = 'info') => setAlertState({ isOpen: true, title, message, type });
    const [confirmState, setConfirmState] = React.useState({ isOpen: false, message: '', onConfirm: () => {}, item: null });

    const handleAggiungiVenditore = async () => {
        if (nuovoVenditore.trim() === '') { showAlert("Attenzione", "Il nome del venditore non può essere vuoto."); return; }
        if (venditori.some(v => v.nome.toLowerCase() === nuovoVenditore.trim().toLowerCase())) { showAlert("Attenzione", "Questo venditore esiste già."); return; }
        await addDocument('venditori', { nome: nuovoVenditore.trim() });
        setNuovoVenditore('');
        showAlert("Successo", "Venditore aggiunto.", 'success');
    };

    const handleAggiungiEmail = async () => {
        if (nuovaEmailNome.trim() === '' || nuovaEmailAddr.trim() === '') { showAlert("Attenzione", "Compilare entrambi i campi email."); return; }
        if (!/^\S+@\S+\.\S+$/.test(nuovaEmailAddr)) { showAlert("Attenzione", "Indirizzo email non valido.", 'error'); return; }
        await addDocument('emailAmministrazioni', { nomeContatto: nuovaEmailNome.trim(), email: nuovaEmailAddr.trim() });
        setNuovaEmailNome('');
        setNuovaEmailAddr('');
        showAlert("Successo", "Email aggiunta.", 'success');
    };
    
    const requestDelete = (type, item) => {
        const message = type === 'venditore' 
            ? `Sei sicuro di voler eliminare il venditore "${item.nome}"?`
            : `Sei sicuro di voler eliminare il contatto "${item.nomeContatto}" (${item.email})?`;
        
        setConfirmState({
            isOpen: true,
            message: message,
            item: item,
            onConfirm: async () => {
                const collectionName = type === 'venditore' ? 'venditori' : 'emailAmministrazioni';
                await deleteDocument(collectionName, item.id);
                showAlert("Successo", "Elemento eliminato.", 'success');
                setConfirmState({ isOpen: false, message: '', onConfirm: () => {}, item: null });
            }
        });
    };

    return (
        <div>
            <AlertModal {...alertState} onClose={() => setAlertState({ ...alertState, isOpen: false })} />
            <ConfirmModal 
                isOpen={confirmState.isOpen}
                onCancel={() => setConfirmState({ isOpen: false, message: '', onConfirm: () => {}, item: null })}
                onConfirm={confirmState.onConfirm}
                title="Conferma Eliminazione"
                message={confirmState.message}
            />
            <h3 className="text-2xl font-semibold mb-4">Gestione Elenchi</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-xl font-semibold mb-4">Elenco Venditori</h4>
                    <div className="flex gap-2 mb-4">
                        <Input type="text" value={nuovoVenditore} onChange={e => setNuovoVenditore(e.target.value)} placeholder="Nome venditore" />
                        <Button onClick={handleAggiungiVenditore} icon={PlusCircle} className="bg-blue-500 hover:bg-blue-600">Aggiungi</Button>
                    </div>
                    <ul className="space-y-2">{venditori.sort((a,b) => a.nome.localeCompare(b.nome)).map(v => (<li key={v.id} className="flex justify-between items-center bg-white p-2 rounded shadow-sm"><span>{v.nome}</span><button onClick={() => requestDelete('venditore', v)} className="text-red-500 hover:text-red-700"><Trash2 size={18} /></button></li>))}</ul>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-xl font-semibold mb-4">Elenco Email Amministrazioni</h4>
                    <div className="space-y-2 mb-4">
                        <Input type="text" value={nuovaEmailNome} onChange={e => setNuovaEmailNome(e.target.value)} placeholder="Nome contatto/ufficio" />
                        <Input type="email" value={nuovaEmailAddr} onChange={e => setNuovaEmailAddr(e.target.value)} placeholder="Indirizzo email" />
                    </div>
                    <Button onClick={handleAggiungiEmail} icon={PlusCircle} className="bg-blue-500 hover:bg-blue-600 w-full">Aggiungi Email</Button>
                    <ul className="space-y-2 mt-4">{emailAmministrazioni.sort((a,b) => a.nomeContatto.localeCompare(b.nomeContatto)).map(e => (<li key={e.id} className="flex justify-between items-center bg-white p-2 rounded shadow-sm"><div><p className="font-semibold">{e.nomeContatto}</p><p className="text-sm text-gray-600">{e.email}</p></div><button onClick={() => requestDelete('email', e)} className="text-red-500 hover:text-red-700"><Trash2 size={18} /></button></li>))}</ul>
                </div>
            </div>
        </div>
    );
};

const Contattologia = () => (
    <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-3xl font-bold text-gray-800">Contattologia</h2>
        <p className="mt-4 text-gray-600">Questa sezione è in fase di sviluppo.</p>
    </div>
);


// --- Main App Component ---
export default function App() {
    const [activeSection, setActiveSection] = React.useState('laboratorio');
    const [user, setUser] = React.useState(null);
    const [isAuthReady, setIsAuthReady] = React.useState(false);
    
    // Data hooks
    const vendite = useFirestoreCollection('vendite');
    const venditori = useFirestoreCollection('venditori');
    const emailAmministrazioni = useFirestoreCollection('emailAmministrazioni');

    React.useEffect(() => {
        // This effect handles the initial authentication.
        const authenticateUser = async () => {
            onAuthStateChanged(auth, async (currentUser) => {
                if (currentUser) {
                    setUser(currentUser);
                    setIsAuthReady(true);
                } else {
                    try {
                        // Use custom token if available, otherwise sign in anonymously
                        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                            await signInWithCustomToken(auth, __initial_auth_token);
                        } else {
                            await signInAnonymously(auth);
                        }
                        // onAuthStateChanged will be triggered again, setting the user.
                    } catch (error) {
                        console.error("Authentication Error:", error);
                        setIsAuthReady(true); // Stop loading even if auth fails
                    }
                }
            });
        };
        authenticateUser();
    }, []);

    const renderSection = () => {
        switch (activeSection) {
            case 'amministrazione': return <Amministrazione venditori={venditori} emailAmministrazioni={emailAmministrazioni} vendite={vendite} />;
            case 'laboratorio': return <Laboratorio vendite={vendite} venditori={venditori} />;
            case 'contattologia': return <Contattologia />;
            default: return <Laboratorio vendite={vendite} venditori={venditori} />;
        }
    };
    
    const SidebarButton = ({ section, label, icon: Icon }) => (
        <button onClick={() => setActiveSection(section)} className={`w-full flex items-center p-3 rounded-lg transition-colors duration-200 ${activeSection === section ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-700 hover:bg-gray-200'}`}>
            <Icon size={20} className="mr-3" />
            <span className="font-semibold">{label}</span>
        </button>
    );

    if (!isAuthReady) { 
        return (
            <div className="h-screen w-screen flex justify-center items-center bg-gray-100">
                <div className="text-center">
                    <p className="text-xl font-semibold">Caricamento e autenticazione...</p>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mt-4"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
            `}</style>
            <div className="w-64 bg-white shadow-md flex flex-col p-4">
                <div className="mb-8"><h1 className="text-2xl font-bold text-gray-800">VisionOttica</h1><p className="text-sm text-gray-500">Console Gestionale</p></div>
                <nav className="flex flex-col gap-2">
                    <SidebarButton section="laboratorio" label="Laboratorio" icon={FlaskConical} />
                    <SidebarButton section="amministrazione" label="Amministrazione" icon={LayoutDashboard} />
                    <SidebarButton section="contattologia" label="Contattologia" icon={Contact} />
                </nav>
                <div className="mt-auto bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-bold text-gray-700 mb-2">Info Utente</h3>
                    <p className="text-xs break-words"><strong>UserID:</strong> {user ? user.uid : 'N/A'}</p>
                </div>
            </div>
            <main className="flex-1 p-8 overflow-y-auto">{renderSection()}</main>
        </div>
    );
}
