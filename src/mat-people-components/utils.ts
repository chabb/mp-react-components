// JS community try to avoid using bind. It's considered as an anti-pattern in the typescript world

import axios from 'axios';

export function dictToList(categories: { [id: string]: any }) {
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

export function groupBy(objectArray: any[], property: string) {
  return objectArray.reduce((acc, obj) => {
    const key = obj[property];
    acc[key] ? (acc[key] = []) : acc[key].push(obj);
    return acc;
  }, {});
}

export function fetchSuggestions(
  endPoint: string,
  searchTerm: string,
  sort: string,
  size: number,
  searchField: string,
  config: any
) {
  return axios
    .post(
      endPoint,
      {
        query: {
          match: {
            [searchField]: searchTerm
          }
          // multi_match: {
          //   query: value,
          //   fields: this.props.fields
          // }
        },
        sort,
        size
      },
      config
    )
    .then(res => {
      // const results = res.data.hits.hits.map(h => h._source);
      // this can potentially fail
      if (!res.data || !res.data.hits || !res.data.data.hits || !res.data.data.hits.length) {
        console.warn('invalid result, or result missing');
        return [];
      }
      return dictToList(groupBy(res.data.hits.hits, '_index'));
      //console.log(dictToList(groupBy(results, '_index')));
      // this.setState({suggestions: [{"title": "Properties", "suggestions": results}]})
    });
}
