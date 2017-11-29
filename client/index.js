import React from 'react';
import ReactDOM from 'react-dom';

import Homepage from './pages/Homepage';

import 'bootstrap/dist/css/bootstrap.css';
import 'font-awesome/css/font-awesome.css';
import './index.css';

if (module.hot) {
	   module.hot.accept()
}

ReactDOM.render(<Homepage />, document.getElementById('app'));
