module.exports = (Mongoose, database) => {
    const codeSchema = new Mongoose.Schema({
        codeAuthors: Array,
        codeModules: Array,
        codeID: String,
        codeCategory: String,
        codeCommand: String,
        codeDesc: String,
        codeMain: String,
        codeName: String,
        codeStatus: Boolean,
        sharerID: String,
        uploadDate: Date,
    });

    Mongoose.model("codes", codeSchema);
    return database.models;
}
