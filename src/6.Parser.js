var Parser = {
	toFunction: function(template) {

		var START = '#{',
			END = '}',
			FIND_LENGHT = 2,
			arr = [],
			index = 0,
			lastIndex = 0,
			i = 0,
			end = 0;
		while ((index = template.indexOf(START, index)) > -1) {

			end = template.indexOf(END, index + FIND_LENGHT);
			if (end === -1) {
				index += FIND_LENGHT;
				continue;
			}

			if (lastIndex < index) {
				arr[i] = template.substring(lastIndex, index);
				i++;
			}

			if (index === lastIndex) {
				arr[i] = '';
				i++;
			}

			arr[i] = template.substring(index + FIND_LENGHT, end);
			i++;
			lastIndex = index = end + 1;
		}

		if (lastIndex < template.length) {
			arr[i] = template.substring(lastIndex);
		}

		template = null;
		return function(model, type, cntx, element, name) {
			return Helper.interpolate(arr, model, type, cntx, element, name);
		};
	},
	parseAttributes: function(T, node) {

		var template = T.template,
			key, value, _classNames, c, start;
		if (node.attr == null) {
			node.attr = {};
		}

		loop: for (; T.index < T.length;) {
			key = null;
			value = null;
			c = template.charCodeAt(T.index);
			switch (c) {
			case 32:
				//case 9: was replaced while compiling
				//case 10:
				T.index++;
				continue;

				//case '{;>':
			case 123:
			case 59:
			case 62:

				break loop;

			case 46:
				/* '.' */

				start = T.index + 1;
				T.skipToAttributeBreak();

				value = template.substring(start, T.index);

				_classNames = _classNames != null ? _classNames + ' ' + value : value;

				break;
			case 35:
				/* '#' */
				key = 'id';

				start = T.index + 1;
				T.skipToAttributeBreak();
				value = template.substring(start, T.index);

				break;
			default:
				key = this.parseAttributeValue(T);
				if (template.charCodeAt(T.index) !== 61 /* = */ ) {
					value = key;
				} else {
					T.index++;
					T.skipWhitespace();
					value = this.parseAttributeValue(T);
				}

				break;
			}


			if (key != null) {
				//console.log('key', key, value);
				if (value.indexOf('#{') > -1) {
					value = T.serialize !== true ? this.toFunction(value) : {
						template: value
					};
				}
				node.attr[key] = value;
			}
		}
		if (_classNames != null) {
			node.attr['class'] = _classNames.indexOf('#{') > -1 ? (T.serialize !== true ? this.toFunction(_classNames) : {
				template: _classNames
			}) : _classNames;

		}


	},
	parseAttributeValue: function(T) {
		var c = T.template.charCodeAt(T.index),
			value;
		if (c === 34 /* " */ || c === 39 /* ' */ ) {
			T.index++;
			value = T.sliceToChar(c === 34 ? '"' : "'");
			T.index++;
			return value;
		}
		var start = T.index;

		do {
			c = T.template.charCodeAt(++T.index);
		} while (c !== 61 /*=*/ && c !== 32 && c !== 123 /*{*/ && c !== 62 /*>*/ && c !== 59 /*;*/ && T.index < T.length);

		value = T.template.substring(start, T.index);

		if (c === 32) {
			T.skipWhitespace();
		}

		return value;
	},
	/** @out : nodes */
	parse: function(T) {
		var current = T;
		for (; T.index < T.length; T.index++) {
			var c = T.template.charCodeAt(T.index);
			switch (c) {
			case 32:
				continue;
			case 39:
				/* ' */
			case 34:
				/* " */

				T.index++;

				var content = T.sliceToChar(c === 39 ? "'" : '"');
				if (content.indexOf('#{') > -1) {
					content = T.serialize !== true ? this.toFunction(content) : {
						template: content
					};
				}

				var t = {
					content: content
				};
				if (current.nodes == null) {
					current.nodes = t;
				} else if (current.nodes.push == null) {
					current.nodes = [current.nodes, t];
				} else {
					current.nodes.push(t);
				}
				

				if (current.__single) {
					if (current == null) {
						continue;
					}
					current = current.parent;
					while (current != null && current.__single != null) {
						current = current.parent;
					}
				}
				continue;
			case 62:
				/* '>' */
				current.__single = true;
				continue;
			case 123:
				/* '{' */

				continue;
			case 59:
				/* ';' */
				/** continue if semi-column, but is not a single tag (else goto 125) */
				if (current.nodes != null) {
					continue;
				}

				/* falls through */
			case 125:
				/* '}' */
				if (current == null) {
					continue;
				}

				do {
					current = current.parent;
				}
				while (current != null && current.__single != null);

				continue;
			}

			var tagName = null;
			if (c === 46 /* . */ || c === 35 /* # */ ) {
				tagName = 'div';
			} else {
				var start = T.index;
				do {
					c = T.template.charCodeAt(++T.index);
				}
				while (c !== 32 && c !== 35 && c !== 46 && c !== 59 && c !== 123 && c !== 62 && T.index <= T.length); /** while !: ' ', # , . , ; , { <*/

				tagName = T.template.substring(start, T.index);
			}

			if (tagName === '') {
				console.error('Parse Error: Undefined tag Name %d/%d %s', T.index, T.length, T.template.substring(T.index, T.index + 10));
			}

			var tag = {
				tagName: tagName,
				parent: current
			};

			if (current == null) {
				console.log('T', T, 'rest', T.template.substring(T.index));
			}

			if (current.nodes == null) {
				current.nodes = tag;
			} else if (current.nodes.push == null) {
				current.nodes = [current.nodes, tag];
			} else {
				current.nodes.push(tag);
			}
			//-if (current.nodes == null) current.nodes = [];
			//-current.nodes.push(tag);

			current = tag;

			this.parseAttributes(T, current);

			T.index--;
		}
		return T.nodes;
	},
	cleanObject: function(obj) {
		if (obj instanceof Array) {
			for (var i = 0; i < obj.length; i++) {
				this.cleanObject(obj[i]);
			}
			return obj;
		}
		delete obj.parent;
		delete obj.__single;

		if (obj.nodes != null) {
			this.cleanObject(obj.nodes);
		}

		return obj;
	}
};
