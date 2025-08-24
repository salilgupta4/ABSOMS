import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import TransporterList from './TransporterList';
import TransporterForm from './TransporterForm';
import TransporterLedger from './TransporterLedger';
import PendingPaymentsList from './PendingPaymentsList';

const TransportModule: React.FC = () => {
  return (
    <Routes>
      <Route index element={<Navigate to="list" replace />} />
      <Route path="list" element={<TransporterList />} />
      <Route path="new" element={<TransporterForm />} />
      <Route path=":id/edit" element={<TransporterForm />} />
      <Route path=":id/ledger" element={<TransporterLedger />} />
      <Route path="pending" element={<PendingPaymentsList />} />
    </Routes>
  );
};

export default TransportModule;