const express = require('express');
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');
const morgan = require('morgan'); // Para logging
require('dotenv').config(); // Para usar variables de entorno
const axios = require('axios'); // Para hacer solicitudes HTTP a la API de Python
const app = express();

// Middleware para analizar el cuerpo de las solicitudes en formato JSON
app.use(bodyParser.json());
app.use(morgan('combined')); // Logging de las solicitudes HTTP

// Configurar la URL de MongoDB y otras variables
const mongoURL = process.env.MONGO_URL || 'mongodb://localhost:27017'; // Es variable de entorno (Revisar .env)

const DATABASE_NAME = 'bd_api_node';
const COLLECTION_RESERVAS = 'Reserva';
const COLLECTION_ESPACIOS = 'Espacio';

let mongoClient; // Variable para almacenar la conexión de MongoDB

// Reutilizar la conexión de MongoDB
async function getMongoClient() {
    if (!mongoClient) {
        mongoClient = new MongoClient(mongoURL, { useUnifiedTopology: true });
        await mongoClient.connect();
    }
    return mongoClient;
}

// Clase MongoAPI para manejar las operaciones CRUD
class MongoAPI {
    constructor(collectionName) {
        this.collectionName = collectionName;
    }

    async connect() {
        const client = await getMongoClient();
        this.db = client.db(DATABASE_NAME);
        this.col = this.db.collection(this.collectionName);
    }

    async read() {
        console.log('Reading All Data');
        const documents = await this.col.find({}).toArray();
        return documents.map(({ _id, ...rest }) => rest); // Omitir el campo _id
    }

    async write(data) {
        console.log('Writing Data');
        const newDocument = data.Document;
        const response = await this.col.insertOne(newDocument);
        return {
            Status: 'Successfully Inserted',
            Document_ID: response.insertedId.toString()
        };
    }

    async update(data) {
        console.log('Updating Data');
        const filter = data.Filter;
        const updatedData = { $set: data.DataToBeUpdated };
        const response = await this.col.updateOne(filter, updatedData);
        return {
            Status: response.modifiedCount > 0 ? 'Successfully Updated' : 'Nothing was updated.'
        };
    }

    async delete(data) {
        console.log('Deleting Data');
        const filter = data.Filter;
        const response = await this.col.deleteOne(filter);
        return {
            Status: response.deletedCount > 0 ? 'Successfully Deleted' : 'Document not found.'
        };
    }
}

// Función reutilizable para manejar operaciones CRUD
async function handleCrudOperation(req, res, collection, operation) {
    const mongoAPI = new MongoAPI(collection);
    try {
        await mongoAPI.connect();
        const response = await operation(mongoAPI);
        res.status(200).json(response);
    } catch (error) {
        console.error('Error during CRUD operation:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

// funcion que llama al Microservicio de Python

async function verificarCurso(idCurso) {
    try {
        // URL del microservicio Python para verificar el curso
        const pythonApiUrl = `http://127.0.0.1:8000/cursos/${idCurso}`; // Cambiar a la URL correcta de tu API de Python
        const response = await axios.get(pythonApiUrl);
        
        if (response.data && response.data.Curso) {
            return true; // El curso existe
        } else {
            return false; // El curso no existe
        }
    } catch (error) {
        console.error('Error al verificar el curso:', error);
        return false; // Considerar como que no existe si hay un error en la solicitud
    }
}




// Ruta base
app.get('/', (req, res) => {
    res.json({ Status: 'UP' });
});

// Rutas para "Reservas"

// Leer documentos (GET)
app.get('/reservas', (req, res) => {
    handleCrudOperation(req, res, COLLECTION_RESERVAS, (api) => api.read());
});

// POST para crear una reserva
app.post('/reservas', async (req, res) => {
    const data = req.body;
    if (!data || !data.Document || !data.Document.idCurso) {
        return res.status(400).json({ Error: 'Por favor proporcione un documento válido con idCurso.' });
    }
    const idCurso = data.Document.idCurso;
    // Verificar si el curso existe en la API de Python
    const cursoExiste = await verificarCurso(idCurso);
    if (!cursoExiste) {
        return res.status(404).json({ Error: `El curso con id ${idCurso} no existe en la API de Python.` });
    }
    // Si el curso existe, proceder a insertar la reserva
    handleCrudOperation(req, res, COLLECTION_RESERVAS, (api) => api.write(data));
});

// Actualizar un documento (PUT)
app.put('/reservas', (req, res) => {
    const data = req.body;
    if (!data || !data.Filter || !data.DataToBeUpdated) {
        return res.status(400).json({ Error: 'Please provide filter and data to be updated' });
    }
    handleCrudOperation(req, res, COLLECTION_RESERVAS, (api) => api.update(data));
});

// Eliminar un documento (DELETE)
app.delete('/reservas', (req, res) => {
    const data = req.body;
    if (!data || !data.Filter) {
        return res.status(400).json({ Error: 'Please provide filter for deletion' });
    }
    handleCrudOperation(req, res, COLLECTION_RESERVAS, (api) => api.delete(data));
});

// -----------------------------------------------------------------------------------------------------------------

// Rutas para "Espacios"

// Leer documentos (GET)
app.get('/espacios', (req, res) => {
    handleCrudOperation(req, res, COLLECTION_ESPACIOS, (api) => api.read());
});

// Insertar un documento (POST)
app.post('/espacios', (req, res) => {
    const data = req.body;
    if (!data || !data.Document) {
        return res.status(400).json({ Error: 'Please provide valid document information' });
    }
    handleCrudOperation(req, res, COLLECTION_ESPACIOS, (api) => api.write(data));
});

// Actualizar un documento (PUT)
app.put('/espacios', (req, res) => {
    const data = req.body;
    if (!data || !data.Filter || !data.DataToBeUpdated) {
        return res.status(400).json({ Error: 'Please provide filter and data to be updated' });
    }
    handleCrudOperation(req, res, COLLECTION_ESPACIOS, (api) => api.update(data));
});

// Eliminar un documento (DELETE)
app.delete('/espacios', (req, res) => {
    const data = req.body;
    if (!data || !data.Filter) {
        return res.status(400).json({ Error: 'Please provide filter for deletion' });
    }
    handleCrudOperation(req, res, COLLECTION_ESPACIOS, (api) => api.delete(data));
});

// Iniciar servidor
const PORT = process.env.PORT || 8911; // REvisar archivo .env
app.listen(PORT, () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});

