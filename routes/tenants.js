const express = require('express');
const router = express.Router();
const { getTenants, createTenant, updateTenant, deleteTenant } = require('../controllers/tenantController');

router.get('/', getTenants);
router.post('/', createTenant);
router.put('/:id', updateTenant);
router.delete('/:id', deleteTenant);

module.exports = router;
