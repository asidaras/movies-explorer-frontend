import React from 'react';
import { Link } from 'react-router-dom';
import './AccountButton.css';

function AccountButton() {

  return (
    <Link className='account-button' to='/profile' />
  );
}

export default AccountButton;