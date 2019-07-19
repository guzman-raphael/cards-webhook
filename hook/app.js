// curl -d '{"key1":"value1", "key2":"value2"}' -H "Content-Typeapplication/json" -X POST http://localhost:4000

var express = require("express");
var ip = require("ip");
var bodyParser = require('body-parser');
const request = require('./request');

// var github_project = "Hub: Kubernetes Cluster Hosted by AWS";
var github_project = "First Release";
var user = 'vathes';
var repo = 'provision-k8s';
var tok = process.env.GITHUB_TOKEN;
var agent = 'DataJoint-App';

var app = express();
app.use(bodyParser.json());

app.listen(4000, () => {
 console.log(`[${ip.address()}]: Server running on port 4000`);
});

app.get("/", (req, res, next) => {
    console.log(`[${ip.address()}]: GET Response sent @ ${new Date().toISOString()}.`);
    res.json("GET success");
});

app.post("/", (req, res) => {
    moveProgress(req.body);
    moveReview(req.body);

    console.log(`[${ip.address()}]: POST Response sent @ ${new Date().toISOString()}.`);
    console.log(`[${ip.address()}]: POST Data: ${JSON.stringify(req.body)}.`);
    res.json({});
});

async function moveProgress (github_issue_ex) {
    var github_prev_col;
    var github_new_col;
    if (github_issue_ex.action == "assigned") {
        github_prev_col = "To do";
        github_new_col = "In progress";
    } else if (github_issue_ex.action == "unassigned") {
        github_prev_col = "In progress";
        github_new_col = "To do";
    }

    if ( ['assigned', 'unassigned'].includes(github_issue_ex.action) && "issue" in github_issue_ex ) {
        //Get ProjectURL
        var options = {
            method: 'get',
            headers: {
                "User-Agent" : agent,
                "Authorization" : `Bearer ${tok}`,
                "Accept" : "application/vnd.github.inertia-preview+json"
            },
            // url: `https://api.github.com/users/${user}/projects`
            url: `https://api.github.com/repos/${user}/${repo}/projects`
        };
        var ret = await request.restCall(options);

        var project = JSON.parse(ret.body).filter(project => project.name == github_project)[0];
        var project_url = project.url;
        
        //Get ColumnsURL
        var options = {
            method: 'get',
            headers: {
                "User-Agent" : agent,
                "Accept" : "application/vnd.github.inertia-preview+json",
                "Authorization" : `Bearer ${tok}`
            },
            url: project.url
        };
        ret = await request.restCall(options);
        
        var column_url = JSON.parse(ret.body).columns_url;

        //Get ColumnIds
        var options = {
            method: 'get',
            headers: {
                "User-Agent" : agent,
                "Accept" : "application/vnd.github.inertia-preview+json",
                "Authorization" : `Bearer ${tok}`
            },
            url: column_url
        };
        ret = await request.restCall(options);

        var prev_col = JSON.parse(ret.body).filter(column => column.name == github_prev_col)[0];
        var prev_cards_url = prev_col.cards_url;

        var new_col = JSON.parse(ret.body).filter(column => column.name == github_new_col)[0];
        var new_col_id = new_col.id;         
        
        //Get CardsDetails
        var options = {
            method: 'get',
            headers: {
                "User-Agent" : agent,
                "Accept" : "application/vnd.github.inertia-preview+json",
                "Authorization" : `Bearer ${tok}`
            },
            url: prev_cards_url
        };
        ret = await request.restCall(options);

        var card = JSON.parse(ret.body).filter(card => card.content_url == github_issue_ex.issue.url)[0];
        var card_id = card.id; 

        //Move Card
        var options = {
            method: 'post',
            headers: {
                "User-Agent" : agent,
                "Accept" : "application/vnd.github.inertia-preview+json",
                "Authorization" : `Bearer ${tok}`,
                "Content-Type" : "application/json"
            },
            body: JSON.stringify({
                "position": "top",
                "column_id": new_col_id
            }),
            url: `https://api.github.com/projects/columns/cards/${card_id}/moves`
        };
        ret = await request.restCall(options);

        if (ret.response.statusCode !== 200) {
            return error(ret.response, ret.body);
        }
        success(ret.response, ret.body);
    }
}

async function moveReview (github_pr_ex) {
    var github_prev_col;
    var github_new_col;
    if ( ['opened'].includes(github_pr_ex.action) && "pull_request" in github_pr_ex ) {
        github_prev_col = "In progress";
        github_new_col = "In review";

        //Get Linked Issues
        var query = `
        query {
            repository(owner: "${user}", name: "${repo}") {
                pullRequest(number: ${github_pr_ex.number}) {
                    bodyHTML
                }
            }
        }
        `;

        var options = {
            method: 'post',
            headers: {
                "User-Agent" : agent,
                "Application" : "application/json",
                "Authorization" : `Bearer ${tok}`
            },
            body: JSON.stringify({"query": query}),
            url: 'https://api.github.com/graphql'
        };
        var ret = await request.restCall(options);

        // console.log(JSON.parse(ret.body).data.repository.pullRequest.bodyHTML);

        var regex = new RegExp(`href="https://github.com/${user}/${repo}/issues/.*">`, "g");
        var issueUrls = JSON.parse(ret.body).data.repository.pullRequest.bodyHTML.match(regex);

        var issueUrls = issueUrls.map(function(url) {
            return "https://api.github.com/repos" + url.substring(24, url.length-2);
        });

        // console.log(issueUrls);

        //Get ProjectURL
        var options = {
            method: 'get',
            headers: {
                "User-Agent" : agent,
                "Authorization" : `Bearer ${tok}`,
                "Accept" : "application/vnd.github.inertia-preview+json"
            },
            // url: `https://api.github.com/users/${user}/projects`
            url: `https://api.github.com/repos/${user}/${repo}/projects`
        };
        var ret = await request.restCall(options);

        var project = JSON.parse(ret.body).filter(project => project.name == github_project)[0];
        var project_url = project.url;
        
        //Get ColumnsURL
        var options = {
            method: 'get',
            headers: {
                "User-Agent" : agent,
                "Accept" : "application/vnd.github.inertia-preview+json",
                "Authorization" : `Bearer ${tok}`
            },
            url: project.url
        };
        ret = await request.restCall(options);
        
        var column_url = JSON.parse(ret.body).columns_url;

        //Get ColumnIds
        var options = {
            method: 'get',
            headers: {
                "User-Agent" : agent,
                "Accept" : "application/vnd.github.inertia-preview+json",
                "Authorization" : `Bearer ${tok}`
            },
            url: column_url
        };
        ret = await request.restCall(options);

        var prev_col = JSON.parse(ret.body).filter(column => column.name == github_prev_col)[0];
        var prev_cards_url = prev_col.cards_url;

        var new_col = JSON.parse(ret.body).filter(column => column.name == github_new_col)[0];
        var new_col_id = new_col.id;         
        
        //Get CardsDetails
        var options = {
            method: 'get',
            headers: {
                "User-Agent" : agent,
                "Accept" : "application/vnd.github.inertia-preview+json",
                "Authorization" : `Bearer ${tok}`
            },
            url: prev_cards_url
        };
        ret = await request.restCall(options);

        var card = JSON.parse(ret.body).filter(card => card.content_url == issueUrls[0])[0];
        var card_id = card.id; 

        //Move Card
        var options = {
            method: 'post',
            headers: {
                "User-Agent" : agent,
                "Accept" : "application/vnd.github.inertia-preview+json",
                "Authorization" : `Bearer ${tok}`,
                "Content-Type" : "application/json"
            },
            body: JSON.stringify({
                "position": "top",
                "column_id": new_col_id
            }),
            url: `https://api.github.com/projects/columns/cards/${card_id}/moves`
        };
        ret = await request.restCall(options);

        if (ret.response.statusCode !== 200) {
            return error(ret.response, ret.body);
        }
        success(ret.response, ret.body);
    }
}

function success (response, body) {
    console.log(`Status: ${response.statusCode}`);
    console.log(`Message: ${response.statusMessage}`);
    console.log(`Request Body: ${body}`);
}
function error (response) {
    console.log(`Status: ${response.statusCode}`);
    console.log(`Message: ${response.statusMessage}`);
    console.log(`Body: ${response.body}`);
}
