import React, { Component } from 'react';
import PropTypes, { InferProps } from 'prop-types';
import Autosuggest from 'react-autosuggest';
import axios from 'axios';
import { debounce } from 'throttle-debounce';

// JS community try to avoid using bind. It's considered as an anti-pattern in the typescript world

function dictToList(categories: { [id: string]: any }) {
  // console.log("categories", categories)
  return Object.keys(categories).reduce((acc: { title: string; suggestions }[], catKey: string) => {
    return [...acc, { title: catKey, suggestions: categories[catKey] }];
  }, []);
  /*
    const sections = [];
  for (const key in categories) {
    if (categories.hasOwnProperty(key)) {
      sections.push({"title": key, "suggestions": categories[key]});
    }
  }*/
}

function groupBy(objectArray: any[], property: string) {
  return objectArray.reduce((acc, obj) => {
    const key = obj[property];
    acc[key] ? (acc[key] = []) : acc[key].push(obj);
    return acc;
  }, {});
}

/**
 * ESAutosuggest is a composition with Reach Autosuggest (RA),
 * which is a WAI-ARIA compliant autosuggest component built in React.
 * This component allows the user to connect RA with Elasticsearch
 * to provide real-time suggestions to the user.
 */
export default class Autocomplete extends Component<
  InferProps<typeof Autocomplete.propTypes>,
  any
> {
  constructor(public props: any) {
    super(props);

    // one of those two is not needed
    this.state = { value: '', suggestions: [] };
    this.setState({ value: '', suggestions: [] });
  }

  // this looks like a variant of derivePropsFromState ( and it should be only called when the component received new props
  // and you can potentially check that the props have not changed before calling it
  // using hooks and a pure functional component would make it easier

  // see https://reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html
  // which is actually a bit outdated, hook replaces all those solutions

  propsToState(newProps) {
    this.setState({
      value: newProps.value !== null ? newProps.value : '',
      suggestions: newProps.suggestions
    });
  }

  // this method is not recommended to use
  componentWillReceiveProps(newProps) {
    this.propsToState(newProps);
  }

  // this will trigger multiple state change
  componentWillMount() {
    this.propsToState(this.props);
    // what is the point of calling debounce ?
    this.onSuggestionsFetchRequested = debounce(0, this.onSuggestionsFetchRequested);
  }

  onKeyPress(event) {
    if (event.key === 'Enter') {
      const payload = {
        n_submit: this.props.n_submit + 1,
        n_submit_timestamp: Date.now(),
        value: this.state.value
      };
      this.props.setProps(payload);
      // ^ not sure to understand this part too
    }
  }

  onSuggestionSelected(event, { suggestion, suggestionValue, method }) {
    if (method === 'enter' || method === 'click') {
      const payload = {
        value: suggestionValue,
        lastValueMeta: suggestion
      };
      // ^ not sure to understand this part ^^
      this.props.setProps(payload);
    }
  }

  // TODO: Make this more general so it can handle arbitrary returned data (multiple keys)
  renderSuggestion(suggestion) {
    const source = suggestion._source;
    if (this.props.additionalField === null) {
      return source[this.props.defaultField];
    }
    const entity = source[this.props.defaultField];
    const normalized = source[this.props.additionalField];
    // i would change the naming ( i'm not sure to understand it )
    return entity !== normalized ? (
      <span>{`${entity} [${normalized}]`}</span>
    ) : (
      <span>{`${entity}`}</span>
    );
  }

  renderSectionTitle(section) {
    const title =
      !!this.props.sectionMap && !!this.props.sectionMap[section.title]
        ? this.props.sectionMap[section.title]
        : section.title;
    return <strong>{title}</strong>;
  }

  onChange(event, { newValue }) {
    this.setState({ value: newValue });
  }


  // i would extract this method in a dedicated file, that way it can be mocked for testing with jest
  // you can use await/async to make it look synchronous, or use RxJS

  /*
   * This contains the logic for how suggestions should be generated. In this case, it's ElasticSearch (via axios).
   */
  onSuggestionsFetchRequested({ value }) {
    const config = { auth: { username: this.props.authUser, password: this.props.authPass } };
    const searchterm = value.includes(', ')
      ? value.substring(value.lastIndexOf(', ') + 2, value.length)
      : value;

    // fetch is sufficient
    axios
      .post(
        this.props.endpoint,
        {
          query: {
            match: {
              [this.props.searchField]: searchterm
            }
            // multi_match: {
            //   query: value,
            //   fields: this.props.fields
            // }
          },
          sort: this.props.sort,
          size: this.props.numSuggestions
        },
        config
      )
      .then(
        res => {
          // const results = res.data.hits.hits.map(h => h._source);
          const results = res.data.hits.hits; // this can potentially fail
          console.log(dictToList(groupBy(results, '_index')));
          // this.setState({suggestions: [{"title": "Properties", "suggestions": results}]})
          // this check is sufficient
          if (results && results.length > 0) {
            const suggestions = dictToList(groupBy(results, '_index'));
            this.setState({ suggestions: suggestions });
          }
        },
        () => {
          // what do we do in case of error
          // either use error boundaries, or present an error message
        }
      );
  }

  onSuggestionsClearRequested() {
    this.setState({ suggestions: [] });
  }

  getSuggestionValue(suggestion) {
    const source = suggestion._source;
    const prefix = this.state.value.includes(', ')
      ? this.state.value.substring(0, this.state.value.lastIndexOf(', ') + 2)
      : '';
    // this.props.setProps({lastValueMeta: suggestion});
    return `${prefix}${source[this.props.defaultField]}`;
  }

  render() {
    const { suggestions, value } = this.state;
    const { placeholder, autoFocus, style, spellCheck } = this.props;

    // i thinks something is a bit weird here, we are passing the same method in multiple places
    // this.onKeyPress,. and by looking at the source code of autosuggest, it's onKeyDown
    const inputProps = {
      placeholder: placeholder,
      value,
      onChange: (event, nw) => this.onChange(event, nw),
      onKeyPress: ev => this.onKeyPress(ev), // i guess it's onKeyDown ?
      onSuggestionSelected: (ev, sugg) => this.onSuggestionSelected(ev, sugg),
      autoComplete: 'off',
      autoFocus: autoFocus,
      style: style,
      spellCheck: spellCheck
    };

    return (
      <Autosuggest
        suggestions={suggestions}
        value={value}
        onSuggestionsFetchRequested={v => this.onSuggestionsFetchRequested(v)}
        onSuggestionsClearRequested={() => this.onSuggestionsClearRequested()}
        //https://github.com/moroshko/react-autosuggest/search?q=onKeyPress&unscoped_q=onKeyPress
        //onKeyPress={event => this.onKeyPress(event)} not a prop
        onSuggestionSelected={(e, a) => this.onSuggestionSelected(e, a)}
        getSuggestionValue={suggestion => this.getSuggestionValue(suggestion)}
        renderSuggestion={suggestion => this.renderSuggestion(suggestion)}
        inputProps={inputProps}
        multiSection={true}
        renderSectionTitle={section => this.renderSectionTitle(section)}
        getSectionSuggestions={section => section.suggestions}
      />
    );
  }

  static defaultProps = {
    value: '',
    n_submit: 0,
    n_submit_timestamp: -1,
    sort: ['_score'],
    suggestions: [],
    endpoint: 'http://localhost:9200', // Default for ElasticSearch
    autoFocus: false,
    lastValueMeta: null
  };

  static propTypes = {
    /**
     * The ID used to identify this component in Dash callbacks
     */
    id: PropTypes.string,

    /**
     * The value displayed in the input
     */
    value: PropTypes.string,

    /**
     * Dash-assigned callback that should be called whenever any of the
     * properties change
     */
    setProps: PropTypes.func,

    /**
     * The ElasticSearch endpoint
     */
    endpoint: PropTypes.string,

    /**
     * The ElasticSearch fields to search on (e.g. ['fullName', 'shortCode'])
     */
    fields: PropTypes.array,

    /**
     * The default field which contains the value that should be autocompleted
     */
    defaultField: PropTypes.string,

    /**
     * Additional field which should be displayed next to autocompleted value
     */
    additionalField: PropTypes.string,

    /**
     * Display single section or multiple sections of results
     */
    multiSection: PropTypes.bool,

    /**
     * Object that maps index name to section header
     */
    sectionMap: PropTypes.object,

    /**
     * Metadata about the value(s) in the box.
     */
    lastValueMeta: PropTypes.object,

    /**
     * How ElasticSearch should sort the results (e.g. ['_score', { createdDate: 'desc' }])
     */
    sort: PropTypes.array,

    /**
     * Placeholder string
     */
    placeholder: PropTypes.string,

    /**
     * Placeholder string
     */
    suggestions: PropTypes.array,

    /**
     * Number of suggestions to display
     */
    numSuggestions: PropTypes.number,

    /**
     * Number of times the `Enter` key was pressed while the input had focus.
     */
    n_submit: PropTypes.number,
    /**
     * Last time that `Enter` was pressed.
     */
    n_submit_timestamp: PropTypes.number,
    /**
     * Username for Elasticsearch.
     */
    authUser: PropTypes.string,
    /**
     * Password for Elasticsearch.
     */
    authPass: PropTypes.string,

    /**
     * Field which query endpoint is matching against (e.g. "name.edgengram")
     */
    searchField: PropTypes.string,

    /**
     * Whether the cursor should automatically be set inside this component. Default is false.
     */
    autoFocus: PropTypes.bool,

    /**
     * Setting the value of this attribute to true indicates that the element needs to have its spelling and grammar checked.
     * The value default indicates that the element is to act according to a default behavior, possibly based on the parent
     * element's own spellcheck value. The value false indicates that the element should not be checked.
     */
    spellCheck: PropTypes.oneOfType([
      // enumerated property, not a boolean property: https://www.w3.org/TR/html51/editing.html#spelling-and-grammar-checking
      PropTypes.oneOf(['true', 'false']),
      PropTypes.bool
    ]),

    /**
     * The input's inline styles
     */
    style: PropTypes.object
  };
}
