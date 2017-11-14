import React, {Component} from 'react';
import axios from 'axios';
import {
	Container,
	Button
} from 'reactstrap';
import AceEditor from 'react-ace';

import './Question.css';

import 'brace/mode/javascript';
import 'brace/theme/monokai';

class Question extends Component {

	constructor(props) {
		super(props);

		this.state = {
			score: null
		}
	}

	submit() {
		axios.post('http://localhost:3000/candidator/validate', { code: '(a,b) => a + b;' })
			.then(res => {
				this.setState({score: res.data.score});
			})
			.catch(err => {
				console.log(err);
			});
	}

	next() {
		console.log('next');
	}

	render() {
		return (
			<Container className="question">

				<div className="header">
					<h2>Welcome to Candidator</h2>
					<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas mollis, massa in porta aliquam, diam purus condimentum nibh, ac rutrum dolor nunc at elit. Morbi consequat convallis eros sit amet dignissim. Duis aliquet et tellus quis tincidunt. Praesent ultricies nisl ac ultrices rhoncus. Donec scelerisque, nibh a tristique malesuada, nibh metus vehicula turpis, non volutpat ligula orci a justo. Sed arcu metus, lobortis id pretium suscipit, pulvinar rhoncus urna. In hac habitasse platea dictumst. Sed mauris ipsum, finibus posuere odio nec, porttitor lobortis justo. Ut pretium sit amet dolor quis mattis.</p>
				</div>

				<div className="content">
					<div className="description">
						<label>Code sample</label>
						<code>
							(a, b) => a + b;
						</code>
					</div>

					<AceEditor
						className="editor"
						mode="javascript"
						theme="monokai"
						onChange={this.onChange}
						fontSize={14}
						showPrintMargin={false}
						showGutter={true}
						highlightActiveLine={true}
						width="100%"
						setOptions={{
							enableBasicAutocompletion: true,
							enableLiveAutocompletion: true,
							enableSnippets: false,
							showLineNumbers: true,
							tabSize: 2
						}}/>
				</div>

				{this.state.score && <div className="score">Your score: <span className={this.state.score > 70 ? 'pass' : 'fail'}>{this.state.score}%</span></div>}

				<div className="controls">
					<Button onClick={this.submit.bind(this)}>{this.state.score ? 'Resubmit' : 'Submit'}</Button>
					<Button onClick={this.next}>Next</Button>
				</div>
			</Container>
		);
	}
}

export default Question;
