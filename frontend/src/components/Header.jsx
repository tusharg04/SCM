import React from 'react';
import './Header.css'; 
import CompanyLogo from 'C:\\tushar\\SCM_internproject\\frontend\\company_image.jpg'; // Adjust path if needed

const Header = () => {
  return (
    <header className="app-header">
      <div className="header-content">
        <img src={CompanyLogo} alt="comapny Logo" className="header-logo" />
        {/* You can add a title or motto here if desired */}
        {/* <h1 className="app-title">Vanya Infosystem Dashboard</h1> */}
      </div>
    </header>
  );
};

export default Header;