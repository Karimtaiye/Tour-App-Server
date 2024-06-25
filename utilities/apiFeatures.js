class ApiFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ['sort', 'field', 'page', 'limit'];
    excludedFields.forEach(el => delete queryObj[el]);

    //Advanced Filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));

    return this;
  }

  sort() {
    //Sorting
    if (this.queryString.sort) {
      const querySortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(querySortBy);
    } else {
      //If no sort query, sort with newest by default
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  limitFields() {
    //field Limiting(projecting)
    if (this.queryString.field) {
      const fields = this.queryString.field.split(',').join(' ');
      console.log(fields);
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  paginate() {
    if (this.queryString.page) {
      const page = this.queryString.page * 1 || 1;
      const limit = this.queryString.limit * 1 || 100;
      const skip = (page - 1) * limit;
      this.query = this.query.skip(skip).limit(limit);
    }
    return this;
  }
}

module.exports = ApiFeatures;
