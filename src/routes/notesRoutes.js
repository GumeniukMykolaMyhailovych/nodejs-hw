import { Router } from 'express';

import notesController from '../controllers/notesController.js';

const router = Router();

router.get('/notes', notesController.getAllNotes);

router.get('/notes/:noteId', notesController.getNoteById);

router.post('/notes', notesController.createNote);

router.delete('/notes/:noteId', notesController.deleteNote);

router.patch('/notes/:noteId', notesController.updateNote);

export default router;