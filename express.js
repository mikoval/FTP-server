const path = require('path');
const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const _ = require('lodash');


const util = require('util')

const app = express();
const port = 5001;

const fs = require('fs');
const FTP_FOLDER = './files';

app.use(cors());
app.use(bodyParser.json({
    limit: '20GB'
}));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(morgan('dev'));

// enable files upload
app.use(fileUpload({
    createParentPath: true,
    useTempFiles: true,
    tempFileDir: './files/tmp/'
}));


app.get('/', (req, res) => {
    console.log("GOT REQUEST AT : " + (new Date().getTime()));
    res.send(createPage(FTP_FOLDER))
    console.log("SENT REQUEST AT : " + (new Date().getTime()));
});

app.use('/files', express.static(path.join(__dirname, 'files')))


var server = app.listen(port, () => {
    console.log(`Example app listening on port ${port}!`)
});

server.keepAliveTimeout = 61 * 1000
server.headersTimeout = 65 * 1000

app.post('/upload-photo', async (req, res) => {
    console.log("UPLOAD FILES HIT!");
    try {
        if (!req.files) {
            console.log("NO FILES");
            res.send({
                status: false,
                message: 'No file uploaded'
            });
        } else {
            let data = [];
            console.log("LOOPING FILES");

            let photo = req.files.photo;
            console.log(util.inspect(photo, false, null, true))

            photo.mv(FTP_FOLDER + '/' + photo.name);

            data.push({
                name: photo.name,
                mimetype: photo.mimetype,
                size: photo.size
            });

            res.send({
                status: true,
                message: 'Successfully uploaded file'
            });
        }
    } catch (err) {
        res.status(500).send(err);
    }
});

function createPage(path) {
    var ret = "";
    ret += createJS();
    ret += createUpload();
    fs.readdirSync(path).forEach(file => {
        ret += createDownloadLink(path, file) + "\n"
    });
    return ret;
}

function createUpload() {
    var str = `
		<form action="upload-photo" method="post" enctype="multipart/form-data">
		<input type="file" name="photo" id="photo" onchange="uploadFile()">
		<input type="submit"> <br>
		<progress id="progressBar" value="0" max="100" style="width:300px;"></progress>
		<h3 id="status"></h3>
		<p id="loaded_n_total"></p>
		</form><br>`
    return str;

}

function createDownloadLink(path, file) {
    var str = '<a href="/files/' + file + '" download="' + file + '">' + file + '</a><br>'
    return str;
}

function createJS() {
    var ret = ` <script>
		function _(el) {
		  return document.getElementById(el);
		}

		function uploadFile() {
		  var file = _("photo").files[0];
		  // alert(file.name+" | "+file.size+" | "+file.type);
		  var formdata = new FormData();
		  formdata.append("photo", file);
		  var ajax = new XMLHttpRequest();
		  ajax.upload.addEventListener("progress", progressHandler, false);
		  ajax.addEventListener("load", completeHandler, false);
		  ajax.addEventListener("error", errorHandler, false);
		  ajax.addEventListener("abort", abortHandler, false);
		  ajax.open("POST", "upload-photo"); 
		  ajax.send(formdata);
		}

		function progressHandler(event) {
		  _("loaded_n_total").innerHTML = "Uploaded " + event.loaded + " bytes of " + event.total;
		  var percent = (event.loaded / event.total) * 100;
		  _("progressBar").value = Math.round(percent);
		  _("status").innerHTML = Math.round(percent) + "% uploaded... please wait";
		}

		function completeHandler(event) {
		  _("status").innerHTML = event.target.responseText;
		  _("progressBar").value = 0; //wil clear progress bar after successful upload
		}

		function errorHandler(event) {
		  _("status").innerHTML = "Upload Failed";
		}

		function abortHandler(event) {
		  _("status").innerHTML = "Upload Aborted";
		}
		</script>`
    return ret;
}
