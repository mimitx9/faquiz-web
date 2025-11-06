import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="w-full py-6">
      <div className="ct-container max-w-7xl mx-auto px-8" data-columns-divider="md:sm">
        <div data-column="copyright">
          <div className="ct-footer-copyright text-left" data-id="copyright">
            <p className="text-sm text-gray-600">Copyright © 2025 - FA Quiz web version by FA Team</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

