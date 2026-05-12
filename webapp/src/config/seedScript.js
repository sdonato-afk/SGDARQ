import { doc, setDoc } from 'firebase/firestore';
import { 
  categoriasFinancieras, 
  rubrosDirectorio, 
  conceptosDirectorio, 
  ingresosObrasList, 
  egresosGlobalList, 
  conceptosGlobalList, 
  ingresosOficinaList, 
  egresosOficinaList, 
  conceptosOficinaList 
} from './taxonomiaEstatica';

const generateId = () => Math.random().toString(36).substring(2, 9);
const colors = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399', '#2dd4bf', '#38bdf8', '#818cf8', '#c084fc', '#f472b6'];

function buildTree(cats, getRubros, getConceptos) {
    return cats.map((catName, i) => {
        const color = colors[i % colors.length];
        const rubrosList = getRubros(catName) || [];
        const rubros = rubrosList.map(rubroName => {
            const conceptosList = getConceptos(catName, rubroName) || [];
            return {
                id: generateId(),
                nombre: rubroName,
                conceptos: conceptosList.filter(c => c !== '-')
            };
        });
        return {
            id: generateId(),
            nombre: catName,
            color: color,
            rubros: rubros
        };
    });
}

export async function seedDatabase(db) {
    try {
        // Obras - Egreso
        const obrasEgresoCats = Object.keys(egresosGlobalList);
        const obrasEgreso = buildTree(
            obrasEgresoCats,
            (cat) => egresosGlobalList[cat],
            (cat, rub) => conceptosGlobalList[cat]?.[rub] || []
        );
        await setDoc(doc(db, 'artifacts/sg-darq/public/data/taxonomias', 'obras_egreso'), { categorias: obrasEgreso });

        // Obras - Ingreso
        const obrasIngresoCats = Object.keys(ingresosObrasList);
        const obrasIngreso = buildTree(
            obrasIngresoCats,
            (cat) => ingresosObrasList[cat],
            () => []
        );
        await setDoc(doc(db, 'artifacts/sg-darq/public/data/taxonomias', 'obras_ingreso'), { categorias: obrasIngreso });

        // Oficina - Egreso
        const ofEgresoCats = Object.keys(egresosOficinaList);
        const ofEgreso = buildTree(
            ofEgresoCats,
            (cat) => egresosOficinaList[cat],
            (cat, rub) => conceptosOficinaList[cat]?.[rub] || []
        );
        await setDoc(doc(db, 'artifacts/sg-darq/public/data/taxonomias', 'oficina_egreso'), { categorias: ofEgreso });

        // Oficina - Ingreso
        const ofIngresoCats = Object.keys(ingresosOficinaList);
        const ofIngreso = buildTree(
            ofIngresoCats,
            (cat) => ingresosOficinaList[cat],
            () => []
        );
        await setDoc(doc(db, 'artifacts/sg-darq/public/data/taxonomias', 'oficina_ingreso'), { categorias: ofIngreso });

        // Alquileres - Egreso (Hereda de global por def, hacemos una copia independiente)
        await setDoc(doc(db, 'artifacts/sg-darq/public/data/taxonomias', 'alquileres_egreso'), { categorias: obrasEgreso });

        // Alquileres - Ingreso
        const alqIngCats = categoriasFinancieras['Alquileres']['Ingreso'];
        const alqIngreso = buildTree(
            alqIngCats,
            (cat) => ['-'],
            () => []
        );
        await setDoc(doc(db, 'artifacts/sg-darq/public/data/taxonomias', 'alquileres_ingreso'), { categorias: alqIngreso });

        // Directorio - Egreso
        const dirEgrCats = categoriasFinancieras['Directorio']['Egreso'];
        const dirEgreso = buildTree(
            dirEgrCats,
            (cat) => rubrosDirectorio[cat] || ['-'],
            (cat, rub) => conceptosDirectorio[rub] || [] // Directorio conceptos mapped by rubro generally
        );
        await setDoc(doc(db, 'artifacts/sg-darq/public/data/taxonomias', 'directorio_egreso'), { categorias: dirEgreso });

        // Directorio - Ingreso
        const dirIngCats = categoriasFinancieras['Directorio']['Ingreso'];
        const dirIngreso = buildTree(
            dirIngCats,
            (cat) => rubrosDirectorio[cat] || ['-'],
            () => []
        );
        await setDoc(doc(db, 'artifacts/sg-darq/public/data/taxonomias', 'directorio_ingreso'), { categorias: dirIngreso });

        console.log("TAXONOMIAS SEEDED COMPLETAMENTE");
        return true;
    } catch(err) {
        console.error("ERROR SEEDING: ", err);
        return false;
    }
}
