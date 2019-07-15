// curl -d '{"key1":"value1", "key2":"value2"}' -H "Content-Typeapplication/json" -X POST http://localhost:4000

var express = require("express");
var ip = require("ip");
var bodyParser = require('body-parser');
const request = require('./request');

// var github_project = "Hub: Kubernetes Cluster Hosted by AWS";
var github_project = "First Release";
var user = 'guzman-raphael';
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

// var is_event = {
//     "action": "assigned",
//     "issue": {
//       "url": "https://api.github.com/repos/guzman-raphael/provision-k8s/issues/11",
//       "repository_url": "https://api.github.com/repos/guzman-raphael/provision-k8s",
//       "labels_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/issues/11/labels{/name}",
//       "comments_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/issues/11/comments",
//       "events_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/issues/11/events",
//       "html_url": "https://github.com/guzman-raphael/provision-k8s/issues/11",
//       "id": 466328714,
//       "node_id": "MDU6SXNzdWU0NjYzMjg3MTQ=",
//       "number": 11,
//       "title": "Tunnel from Localhost to t2.micro to validate access on domain (private VPC)",
//       "user": {
//         "login": "guzman-raphael",
//         "id": 38401847,
//         "node_id": "MDQ6VXNlcjM4NDAxODQ3",
//         "avatar_url": "https://avatars0.githubusercontent.com/u/38401847?v=4",
//         "gravatar_id": "",
//         "url": "https://api.github.com/users/guzman-raphael",
//         "html_url": "https://github.com/guzman-raphael",
//         "followers_url": "https://api.github.com/users/guzman-raphael/followers",
//         "following_url": "https://api.github.com/users/guzman-raphael/following{/other_user}",
//         "gists_url": "https://api.github.com/users/guzman-raphael/gists{/gist_id}",
//         "starred_url": "https://api.github.com/users/guzman-raphael/starred{/owner}{/repo}",
//         "subscriptions_url": "https://api.github.com/users/guzman-raphael/subscriptions",
//         "organizations_url": "https://api.github.com/users/guzman-raphael/orgs",
//         "repos_url": "https://api.github.com/users/guzman-raphael/repos",
//         "events_url": "https://api.github.com/users/guzman-raphael/events{/privacy}",
//         "received_events_url": "https://api.github.com/users/guzman-raphael/received_events",
//         "type": "User",
//         "site_admin": false
//       },
//       "labels": [
//         {
//           "id": 1441869468,
//           "node_id": "MDU6TGFiZWwxNDQxODY5NDY4",
//           "url": "https://api.github.com/repos/guzman-raphael/provision-k8s/labels/enhancement",
//           "name": "enhancement",
//           "color": "a2eeef",
//           "default": true
//         }
//       ],
//       "state": "open",
//       "locked": false,
//       "assignee": null,
//       "assignees": [
//         {
//           "login": "guzman-raphael",
//           "id": 38401847,
//           "node_id": "MDQ6VXNlcjM4NDAxODQ3",
//           "avatar_url": "https://avatars0.githubusercontent.com/u/38401847?v=4",
//           "gravatar_id": "",
//           "url": "https://api.github.com/users/guzman-raphael",
//           "html_url": "https://github.com/guzman-raphael",
//           "followers_url": "https://api.github.com/users/guzman-raphael/followers",
//           "following_url": "https://api.github.com/users/guzman-raphael/following{/other_user}",
//           "gists_url": "https://api.github.com/users/guzman-raphael/gists{/gist_id}",
//           "starred_url": "https://api.github.com/users/guzman-raphael/starred{/owner}{/repo}",
//           "subscriptions_url": "https://api.github.com/users/guzman-raphael/subscriptions",
//           "organizations_url": "https://api.github.com/users/guzman-raphael/orgs",
//           "repos_url": "https://api.github.com/users/guzman-raphael/repos",
//           "events_url": "https://api.github.com/users/guzman-raphael/events{/privacy}",
//           "received_events_url": "https://api.github.com/users/guzman-raphael/received_events",
//           "type": "User",
//           "site_admin": false
//         }
//       ],
//       "milestone": null,
//       "comments": 0,
//       "created_at": "2019-07-10T14:02:58Z",
//       "updated_at": "2019-07-12T19:42:35Z",
//       "closed_at": null,
//       "author_association": "OWNER",
//       "body": ""
//     },
//     "assignee": {
//       "login": "guzman-raphael",
//       "id": 38401847,
//       "node_id": "MDQ6VXNlcjM4NDAxODQ3",
//       "avatar_url": "https://avatars0.githubusercontent.com/u/38401847?v=4",
//       "gravatar_id": "",
//       "url": "https://api.github.com/users/guzman-raphael",
//       "html_url": "https://github.com/guzman-raphael",
//       "followers_url": "https://api.github.com/users/guzman-raphael/followers",
//       "following_url": "https://api.github.com/users/guzman-raphael/following{/other_user}",
//       "gists_url": "https://api.github.com/users/guzman-raphael/gists{/gist_id}",
//       "starred_url": "https://api.github.com/users/guzman-raphael/starred{/owner}{/repo}",
//       "subscriptions_url": "https://api.github.com/users/guzman-raphael/subscriptions",
//       "organizations_url": "https://api.github.com/users/guzman-raphael/orgs",
//       "repos_url": "https://api.github.com/users/guzman-raphael/repos",
//       "events_url": "https://api.github.com/users/guzman-raphael/events{/privacy}",
//       "received_events_url": "https://api.github.com/users/guzman-raphael/received_events",
//       "type": "User",
//       "site_admin": false
//     },
//     "repository": {
//       "id": 195873991,
//       "node_id": "MDEwOlJlcG9zaXRvcnkxOTU4NzM5OTE=",
//       "name": "provision-k8s",
//       "full_name": "guzman-raphael/provision-k8s",
//       "private": false,
//       "owner": {
//         "login": "guzman-raphael",
//         "id": 38401847,
//         "node_id": "MDQ6VXNlcjM4NDAxODQ3",
//         "avatar_url": "https://avatars0.githubusercontent.com/u/38401847?v=4",
//         "gravatar_id": "",
//         "url": "https://api.github.com/users/guzman-raphael",
//         "html_url": "https://github.com/guzman-raphael",
//         "followers_url": "https://api.github.com/users/guzman-raphael/followers",
//         "following_url": "https://api.github.com/users/guzman-raphael/following{/other_user}",
//         "gists_url": "https://api.github.com/users/guzman-raphael/gists{/gist_id}",
//         "starred_url": "https://api.github.com/users/guzman-raphael/starred{/owner}{/repo}",
//         "subscriptions_url": "https://api.github.com/users/guzman-raphael/subscriptions",
//         "organizations_url": "https://api.github.com/users/guzman-raphael/orgs",
//         "repos_url": "https://api.github.com/users/guzman-raphael/repos",
//         "events_url": "https://api.github.com/users/guzman-raphael/events{/privacy}",
//         "received_events_url": "https://api.github.com/users/guzman-raphael/received_events",
//         "type": "User",
//         "site_admin": false
//       },
//       "html_url": "https://github.com/guzman-raphael/provision-k8s",
//       "description": null,
//       "fork": false,
//       "url": "https://api.github.com/repos/guzman-raphael/provision-k8s",
//       "forks_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/forks",
//       "keys_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/keys{/key_id}",
//       "collaborators_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/collaborators{/collaborator}",
//       "teams_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/teams",
//       "hooks_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/hooks",
//       "issue_events_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/issues/events{/number}",
//       "events_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/events",
//       "assignees_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/assignees{/user}",
//       "branches_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/branches{/branch}",
//       "tags_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/tags",
//       "blobs_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/git/blobs{/sha}",
//       "git_tags_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/git/tags{/sha}",
//       "git_refs_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/git/refs{/sha}",
//       "trees_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/git/trees{/sha}",
//       "statuses_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/statuses/{sha}",
//       "languages_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/languages",
//       "stargazers_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/stargazers",
//       "contributors_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/contributors",
//       "subscribers_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/subscribers",
//       "subscription_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/subscription",
//       "commits_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/commits{/sha}",
//       "git_commits_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/git/commits{/sha}",
//       "comments_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/comments{/number}",
//       "issue_comment_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/issues/comments{/number}",
//       "contents_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/contents/{+path}",
//       "compare_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/compare/{base}...{head}",
//       "merges_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/merges",
//       "archive_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/{archive_format}{/ref}",
//       "downloads_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/downloads",
//       "issues_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/issues{/number}",
//       "pulls_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/pulls{/number}",
//       "milestones_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/milestones{/number}",
//       "notifications_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/notifications{?since,all,participating}",
//       "labels_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/labels{/name}",
//       "releases_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/releases{/id}",
//       "deployments_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/deployments",
//       "created_at": "2019-07-08T19:28:41Z",
//       "updated_at": "2019-07-10T14:15:29Z",
//       "pushed_at": "2019-07-11T17:10:39Z",
//       "git_url": "git://github.com/guzman-raphael/provision-k8s.git",
//       "ssh_url": "git@github.com:guzman-raphael/provision-k8s.git",
//       "clone_url": "https://github.com/guzman-raphael/provision-k8s.git",
//       "svn_url": "https://github.com/guzman-raphael/provision-k8s",
//       "homepage": null,
//       "size": 34660,
//       "stargazers_count": 0,
//       "watchers_count": 0,
//       "language": "Shell",
//       "has_issues": true,
//       "has_projects": true,
//       "has_downloads": true,
//       "has_wiki": true,
//       "has_pages": false,
//       "forks_count": 0,
//       "mirror_url": null,
//       "archived": false,
//       "disabled": false,
//       "open_issues_count": 14,
//       "license": null,
//       "forks": 0,
//       "open_issues": 14,
//       "watchers": 0,
//       "default_branch": "master"
//     },
//     "sender": {
//       "login": "guzman-raphael",
//       "id": 38401847,
//       "node_id": "MDQ6VXNlcjM4NDAxODQ3",
//       "avatar_url": "https://avatars0.githubusercontent.com/u/38401847?v=4",
//       "gravatar_id": "",
//       "url": "https://api.github.com/users/guzman-raphael",
//       "html_url": "https://github.com/guzman-raphael",
//       "followers_url": "https://api.github.com/users/guzman-raphael/followers",
//       "following_url": "https://api.github.com/users/guzman-raphael/following{/other_user}",
//       "gists_url": "https://api.github.com/users/guzman-raphael/gists{/gist_id}",
//       "starred_url": "https://api.github.com/users/guzman-raphael/starred{/owner}{/repo}",
//       "subscriptions_url": "https://api.github.com/users/guzman-raphael/subscriptions",
//       "organizations_url": "https://api.github.com/users/guzman-raphael/orgs",
//       "repos_url": "https://api.github.com/users/guzman-raphael/repos",
//       "events_url": "https://api.github.com/users/guzman-raphael/events{/privacy}",
//       "received_events_url": "https://api.github.com/users/guzman-raphael/received_events",
//       "type": "User",
//       "site_admin": false
//     }
//   };

// var pr_event = {
//     "action": "opened",
//     "number": 19,
//     "pull_request": {
//       "url": "https://api.github.com/repos/guzman-raphael/provision-k8s/pulls/19",
//       "id": 297202263,
//       "node_id": "MDExOlB1bGxSZXF1ZXN0Mjk3MjAyMjYz",
//       "html_url": "https://github.com/guzman-raphael/provision-k8s/pull/19",
//       "diff_url": "https://github.com/guzman-raphael/provision-k8s/pull/19.diff",
//       "patch_url": "https://github.com/guzman-raphael/provision-k8s/pull/19.patch",
//       "issue_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/issues/19",
//       "number": 19,
//       "state": "open",
//       "locked": false,
//       "title": "Tunnel",
//       "user": {
//         "login": "guzman-raphael",
//         "id": 38401847,
//         "node_id": "MDQ6VXNlcjM4NDAxODQ3",
//         "avatar_url": "https://avatars0.githubusercontent.com/u/38401847?v=4",
//         "gravatar_id": "",
//         "url": "https://api.github.com/users/guzman-raphael",
//         "html_url": "https://github.com/guzman-raphael",
//         "followers_url": "https://api.github.com/users/guzman-raphael/followers",
//         "following_url": "https://api.github.com/users/guzman-raphael/following{/other_user}",
//         "gists_url": "https://api.github.com/users/guzman-raphael/gists{/gist_id}",
//         "starred_url": "https://api.github.com/users/guzman-raphael/starred{/owner}{/repo}",
//         "subscriptions_url": "https://api.github.com/users/guzman-raphael/subscriptions",
//         "organizations_url": "https://api.github.com/users/guzman-raphael/orgs",
//         "repos_url": "https://api.github.com/users/guzman-raphael/repos",
//         "events_url": "https://api.github.com/users/guzman-raphael/events{/privacy}",
//         "received_events_url": "https://api.github.com/users/guzman-raphael/received_events",
//         "type": "User",
//         "site_admin": false
//       },
//       "body": "Fix #11 \r\nFix #17 ",
//       "created_at": "2019-07-12T19:50:43Z",
//       "updated_at": "2019-07-12T19:50:43Z",
//       "closed_at": null,
//       "merged_at": null,
//       "merge_commit_sha": null,
//       "assignee": null,
//       "assignees": [],
//       "requested_reviewers": [],
//       "requested_teams": [],
//       "labels": [],
//       "milestone": null,
//       "commits_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/pulls/19/commits",
//       "review_comments_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/pulls/19/comments",
//       "review_comment_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/pulls/comments{/number}",
//       "comments_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/issues/19/comments",
//       "statuses_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/statuses/7c2b283794b852370348ede14da2864a741f264f",
//       "head": {
//         "label": "guzman-raphael:tunnel",
//         "ref": "tunnel",
//         "sha": "7c2b283794b852370348ede14da2864a741f264f",
//         "user": {
//           "login": "guzman-raphael",
//           "id": 38401847,
//           "node_id": "MDQ6VXNlcjM4NDAxODQ3",
//           "avatar_url": "https://avatars0.githubusercontent.com/u/38401847?v=4",
//           "gravatar_id": "",
//           "url": "https://api.github.com/users/guzman-raphael",
//           "html_url": "https://github.com/guzman-raphael",
//           "followers_url": "https://api.github.com/users/guzman-raphael/followers",
//           "following_url": "https://api.github.com/users/guzman-raphael/following{/other_user}",
//           "gists_url": "https://api.github.com/users/guzman-raphael/gists{/gist_id}",
//           "starred_url": "https://api.github.com/users/guzman-raphael/starred{/owner}{/repo}",
//           "subscriptions_url": "https://api.github.com/users/guzman-raphael/subscriptions",
//           "organizations_url": "https://api.github.com/users/guzman-raphael/orgs",
//           "repos_url": "https://api.github.com/users/guzman-raphael/repos",
//           "events_url": "https://api.github.com/users/guzman-raphael/events{/privacy}",
//           "received_events_url": "https://api.github.com/users/guzman-raphael/received_events",
//           "type": "User",
//           "site_admin": false
//         },
//         "repo": {
//           "id": 195873991,
//           "node_id": "MDEwOlJlcG9zaXRvcnkxOTU4NzM5OTE=",
//           "name": "provision-k8s",
//           "full_name": "guzman-raphael/provision-k8s",
//           "private": false,
//           "owner": {
//             "login": "guzman-raphael",
//             "id": 38401847,
//             "node_id": "MDQ6VXNlcjM4NDAxODQ3",
//             "avatar_url": "https://avatars0.githubusercontent.com/u/38401847?v=4",
//             "gravatar_id": "",
//             "url": "https://api.github.com/users/guzman-raphael",
//             "html_url": "https://github.com/guzman-raphael",
//             "followers_url": "https://api.github.com/users/guzman-raphael/followers",
//             "following_url": "https://api.github.com/users/guzman-raphael/following{/other_user}",
//             "gists_url": "https://api.github.com/users/guzman-raphael/gists{/gist_id}",
//             "starred_url": "https://api.github.com/users/guzman-raphael/starred{/owner}{/repo}",
//             "subscriptions_url": "https://api.github.com/users/guzman-raphael/subscriptions",
//             "organizations_url": "https://api.github.com/users/guzman-raphael/orgs",
//             "repos_url": "https://api.github.com/users/guzman-raphael/repos",
//             "events_url": "https://api.github.com/users/guzman-raphael/events{/privacy}",
//             "received_events_url": "https://api.github.com/users/guzman-raphael/received_events",
//             "type": "User",
//             "site_admin": false
//           },
//           "html_url": "https://github.com/guzman-raphael/provision-k8s",
//           "description": null,
//           "fork": false,
//           "url": "https://api.github.com/repos/guzman-raphael/provision-k8s",
//           "forks_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/forks",
//           "keys_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/keys{/key_id}",
//           "collaborators_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/collaborators{/collaborator}",
//           "teams_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/teams",
//           "hooks_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/hooks",
//           "issue_events_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/issues/events{/number}",
//           "events_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/events",
//           "assignees_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/assignees{/user}",
//           "branches_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/branches{/branch}",
//           "tags_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/tags",
//           "blobs_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/git/blobs{/sha}",
//           "git_tags_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/git/tags{/sha}",
//           "git_refs_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/git/refs{/sha}",
//           "trees_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/git/trees{/sha}",
//           "statuses_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/statuses/{sha}",
//           "languages_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/languages",
//           "stargazers_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/stargazers",
//           "contributors_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/contributors",
//           "subscribers_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/subscribers",
//           "subscription_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/subscription",
//           "commits_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/commits{/sha}",
//           "git_commits_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/git/commits{/sha}",
//           "comments_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/comments{/number}",
//           "issue_comment_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/issues/comments{/number}",
//           "contents_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/contents/{+path}",
//           "compare_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/compare/{base}...{head}",
//           "merges_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/merges",
//           "archive_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/{archive_format}{/ref}",
//           "downloads_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/downloads",
//           "issues_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/issues{/number}",
//           "pulls_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/pulls{/number}",
//           "milestones_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/milestones{/number}",
//           "notifications_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/notifications{?since,all,participating}",
//           "labels_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/labels{/name}",
//           "releases_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/releases{/id}",
//           "deployments_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/deployments",
//           "created_at": "2019-07-08T19:28:41Z",
//           "updated_at": "2019-07-10T14:15:29Z",
//           "pushed_at": "2019-07-11T17:10:39Z",
//           "git_url": "git://github.com/guzman-raphael/provision-k8s.git",
//           "ssh_url": "git@github.com:guzman-raphael/provision-k8s.git",
//           "clone_url": "https://github.com/guzman-raphael/provision-k8s.git",
//           "svn_url": "https://github.com/guzman-raphael/provision-k8s",
//           "homepage": null,
//           "size": 34660,
//           "stargazers_count": 0,
//           "watchers_count": 0,
//           "language": "Shell",
//           "has_issues": true,
//           "has_projects": true,
//           "has_downloads": true,
//           "has_wiki": true,
//           "has_pages": false,
//           "forks_count": 0,
//           "mirror_url": null,
//           "archived": false,
//           "disabled": false,
//           "open_issues_count": 14,
//           "license": null,
//           "forks": 0,
//           "open_issues": 14,
//           "watchers": 0,
//           "default_branch": "master"
//         }
//       },
//       "base": {
//         "label": "guzman-raphael:master",
//         "ref": "master",
//         "sha": "e78116a454964bc31e82428bc32e82a9ff8dbdb6",
//         "user": {
//           "login": "guzman-raphael",
//           "id": 38401847,
//           "node_id": "MDQ6VXNlcjM4NDAxODQ3",
//           "avatar_url": "https://avatars0.githubusercontent.com/u/38401847?v=4",
//           "gravatar_id": "",
//           "url": "https://api.github.com/users/guzman-raphael",
//           "html_url": "https://github.com/guzman-raphael",
//           "followers_url": "https://api.github.com/users/guzman-raphael/followers",
//           "following_url": "https://api.github.com/users/guzman-raphael/following{/other_user}",
//           "gists_url": "https://api.github.com/users/guzman-raphael/gists{/gist_id}",
//           "starred_url": "https://api.github.com/users/guzman-raphael/starred{/owner}{/repo}",
//           "subscriptions_url": "https://api.github.com/users/guzman-raphael/subscriptions",
//           "organizations_url": "https://api.github.com/users/guzman-raphael/orgs",
//           "repos_url": "https://api.github.com/users/guzman-raphael/repos",
//           "events_url": "https://api.github.com/users/guzman-raphael/events{/privacy}",
//           "received_events_url": "https://api.github.com/users/guzman-raphael/received_events",
//           "type": "User",
//           "site_admin": false
//         },
//         "repo": {
//           "id": 195873991,
//           "node_id": "MDEwOlJlcG9zaXRvcnkxOTU4NzM5OTE=",
//           "name": "provision-k8s",
//           "full_name": "guzman-raphael/provision-k8s",
//           "private": false,
//           "owner": {
//             "login": "guzman-raphael",
//             "id": 38401847,
//             "node_id": "MDQ6VXNlcjM4NDAxODQ3",
//             "avatar_url": "https://avatars0.githubusercontent.com/u/38401847?v=4",
//             "gravatar_id": "",
//             "url": "https://api.github.com/users/guzman-raphael",
//             "html_url": "https://github.com/guzman-raphael",
//             "followers_url": "https://api.github.com/users/guzman-raphael/followers",
//             "following_url": "https://api.github.com/users/guzman-raphael/following{/other_user}",
//             "gists_url": "https://api.github.com/users/guzman-raphael/gists{/gist_id}",
//             "starred_url": "https://api.github.com/users/guzman-raphael/starred{/owner}{/repo}",
//             "subscriptions_url": "https://api.github.com/users/guzman-raphael/subscriptions",
//             "organizations_url": "https://api.github.com/users/guzman-raphael/orgs",
//             "repos_url": "https://api.github.com/users/guzman-raphael/repos",
//             "events_url": "https://api.github.com/users/guzman-raphael/events{/privacy}",
//             "received_events_url": "https://api.github.com/users/guzman-raphael/received_events",
//             "type": "User",
//             "site_admin": false
//           },
//           "html_url": "https://github.com/guzman-raphael/provision-k8s",
//           "description": null,
//           "fork": false,
//           "url": "https://api.github.com/repos/guzman-raphael/provision-k8s",
//           "forks_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/forks",
//           "keys_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/keys{/key_id}",
//           "collaborators_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/collaborators{/collaborator}",
//           "teams_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/teams",
//           "hooks_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/hooks",
//           "issue_events_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/issues/events{/number}",
//           "events_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/events",
//           "assignees_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/assignees{/user}",
//           "branches_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/branches{/branch}",
//           "tags_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/tags",
//           "blobs_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/git/blobs{/sha}",
//           "git_tags_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/git/tags{/sha}",
//           "git_refs_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/git/refs{/sha}",
//           "trees_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/git/trees{/sha}",
//           "statuses_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/statuses/{sha}",
//           "languages_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/languages",
//           "stargazers_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/stargazers",
//           "contributors_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/contributors",
//           "subscribers_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/subscribers",
//           "subscription_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/subscription",
//           "commits_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/commits{/sha}",
//           "git_commits_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/git/commits{/sha}",
//           "comments_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/comments{/number}",
//           "issue_comment_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/issues/comments{/number}",
//           "contents_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/contents/{+path}",
//           "compare_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/compare/{base}...{head}",
//           "merges_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/merges",
//           "archive_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/{archive_format}{/ref}",
//           "downloads_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/downloads",
//           "issues_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/issues{/number}",
//           "pulls_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/pulls{/number}",
//           "milestones_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/milestones{/number}",
//           "notifications_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/notifications{?since,all,participating}",
//           "labels_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/labels{/name}",
//           "releases_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/releases{/id}",
//           "deployments_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/deployments",
//           "created_at": "2019-07-08T19:28:41Z",
//           "updated_at": "2019-07-10T14:15:29Z",
//           "pushed_at": "2019-07-11T17:10:39Z",
//           "git_url": "git://github.com/guzman-raphael/provision-k8s.git",
//           "ssh_url": "git@github.com:guzman-raphael/provision-k8s.git",
//           "clone_url": "https://github.com/guzman-raphael/provision-k8s.git",
//           "svn_url": "https://github.com/guzman-raphael/provision-k8s",
//           "homepage": null,
//           "size": 34660,
//           "stargazers_count": 0,
//           "watchers_count": 0,
//           "language": "Shell",
//           "has_issues": true,
//           "has_projects": true,
//           "has_downloads": true,
//           "has_wiki": true,
//           "has_pages": false,
//           "forks_count": 0,
//           "mirror_url": null,
//           "archived": false,
//           "disabled": false,
//           "open_issues_count": 14,
//           "license": null,
//           "forks": 0,
//           "open_issues": 14,
//           "watchers": 0,
//           "default_branch": "master"
//         }
//       },
//       "_links": {
//         "self": {
//           "href": "https://api.github.com/repos/guzman-raphael/provision-k8s/pulls/19"
//         },
//         "html": {
//           "href": "https://github.com/guzman-raphael/provision-k8s/pull/19"
//         },
//         "issue": {
//           "href": "https://api.github.com/repos/guzman-raphael/provision-k8s/issues/19"
//         },
//         "comments": {
//           "href": "https://api.github.com/repos/guzman-raphael/provision-k8s/issues/19/comments"
//         },
//         "review_comments": {
//           "href": "https://api.github.com/repos/guzman-raphael/provision-k8s/pulls/19/comments"
//         },
//         "review_comment": {
//           "href": "https://api.github.com/repos/guzman-raphael/provision-k8s/pulls/comments{/number}"
//         },
//         "commits": {
//           "href": "https://api.github.com/repos/guzman-raphael/provision-k8s/pulls/19/commits"
//         },
//         "statuses": {
//           "href": "https://api.github.com/repos/guzman-raphael/provision-k8s/statuses/7c2b283794b852370348ede14da2864a741f264f"
//         }
//       },
//       "author_association": "OWNER",
//       "draft": false,
//       "merged": false,
//       "mergeable": null,
//       "rebaseable": null,
//       "mergeable_state": "unknown",
//       "merged_by": null,
//       "comments": 0,
//       "review_comments": 0,
//       "maintainer_can_modify": false,
//       "commits": 1,
//       "additions": 9,
//       "deletions": 9,
//       "changed_files": 1
//     },
//     "repository": {
//       "id": 195873991,
//       "node_id": "MDEwOlJlcG9zaXRvcnkxOTU4NzM5OTE=",
//       "name": "provision-k8s",
//       "full_name": "guzman-raphael/provision-k8s",
//       "private": false,
//       "owner": {
//         "login": "guzman-raphael",
//         "id": 38401847,
//         "node_id": "MDQ6VXNlcjM4NDAxODQ3",
//         "avatar_url": "https://avatars0.githubusercontent.com/u/38401847?v=4",
//         "gravatar_id": "",
//         "url": "https://api.github.com/users/guzman-raphael",
//         "html_url": "https://github.com/guzman-raphael",
//         "followers_url": "https://api.github.com/users/guzman-raphael/followers",
//         "following_url": "https://api.github.com/users/guzman-raphael/following{/other_user}",
//         "gists_url": "https://api.github.com/users/guzman-raphael/gists{/gist_id}",
//         "starred_url": "https://api.github.com/users/guzman-raphael/starred{/owner}{/repo}",
//         "subscriptions_url": "https://api.github.com/users/guzman-raphael/subscriptions",
//         "organizations_url": "https://api.github.com/users/guzman-raphael/orgs",
//         "repos_url": "https://api.github.com/users/guzman-raphael/repos",
//         "events_url": "https://api.github.com/users/guzman-raphael/events{/privacy}",
//         "received_events_url": "https://api.github.com/users/guzman-raphael/received_events",
//         "type": "User",
//         "site_admin": false
//       },
//       "html_url": "https://github.com/guzman-raphael/provision-k8s",
//       "description": null,
//       "fork": false,
//       "url": "https://api.github.com/repos/guzman-raphael/provision-k8s",
//       "forks_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/forks",
//       "keys_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/keys{/key_id}",
//       "collaborators_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/collaborators{/collaborator}",
//       "teams_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/teams",
//       "hooks_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/hooks",
//       "issue_events_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/issues/events{/number}",
//       "events_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/events",
//       "assignees_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/assignees{/user}",
//       "branches_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/branches{/branch}",
//       "tags_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/tags",
//       "blobs_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/git/blobs{/sha}",
//       "git_tags_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/git/tags{/sha}",
//       "git_refs_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/git/refs{/sha}",
//       "trees_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/git/trees{/sha}",
//       "statuses_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/statuses/{sha}",
//       "languages_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/languages",
//       "stargazers_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/stargazers",
//       "contributors_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/contributors",
//       "subscribers_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/subscribers",
//       "subscription_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/subscription",
//       "commits_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/commits{/sha}",
//       "git_commits_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/git/commits{/sha}",
//       "comments_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/comments{/number}",
//       "issue_comment_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/issues/comments{/number}",
//       "contents_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/contents/{+path}",
//       "compare_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/compare/{base}...{head}",
//       "merges_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/merges",
//       "archive_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/{archive_format}{/ref}",
//       "downloads_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/downloads",
//       "issues_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/issues{/number}",
//       "pulls_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/pulls{/number}",
//       "milestones_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/milestones{/number}",
//       "notifications_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/notifications{?since,all,participating}",
//       "labels_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/labels{/name}",
//       "releases_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/releases{/id}",
//       "deployments_url": "https://api.github.com/repos/guzman-raphael/provision-k8s/deployments",
//       "created_at": "2019-07-08T19:28:41Z",
//       "updated_at": "2019-07-10T14:15:29Z",
//       "pushed_at": "2019-07-11T17:10:39Z",
//       "git_url": "git://github.com/guzman-raphael/provision-k8s.git",
//       "ssh_url": "git@github.com:guzman-raphael/provision-k8s.git",
//       "clone_url": "https://github.com/guzman-raphael/provision-k8s.git",
//       "svn_url": "https://github.com/guzman-raphael/provision-k8s",
//       "homepage": null,
//       "size": 34660,
//       "stargazers_count": 0,
//       "watchers_count": 0,
//       "language": "Shell",
//       "has_issues": true,
//       "has_projects": true,
//       "has_downloads": true,
//       "has_wiki": true,
//       "has_pages": false,
//       "forks_count": 0,
//       "mirror_url": null,
//       "archived": false,
//       "disabled": false,
//       "open_issues_count": 14,
//       "license": null,
//       "forks": 0,
//       "open_issues": 14,
//       "watchers": 0,
//       "default_branch": "master"
//     },
//     "sender": {
//       "login": "guzman-raphael",
//       "id": 38401847,
//       "node_id": "MDQ6VXNlcjM4NDAxODQ3",
//       "avatar_url": "https://avatars0.githubusercontent.com/u/38401847?v=4",
//       "gravatar_id": "",
//       "url": "https://api.github.com/users/guzman-raphael",
//       "html_url": "https://github.com/guzman-raphael",
//       "followers_url": "https://api.github.com/users/guzman-raphael/followers",
//       "following_url": "https://api.github.com/users/guzman-raphael/following{/other_user}",
//       "gists_url": "https://api.github.com/users/guzman-raphael/gists{/gist_id}",
//       "starred_url": "https://api.github.com/users/guzman-raphael/starred{/owner}{/repo}",
//       "subscriptions_url": "https://api.github.com/users/guzman-raphael/subscriptions",
//       "organizations_url": "https://api.github.com/users/guzman-raphael/orgs",
//       "repos_url": "https://api.github.com/users/guzman-raphael/repos",
//       "events_url": "https://api.github.com/users/guzman-raphael/events{/privacy}",
//       "received_events_url": "https://api.github.com/users/guzman-raphael/received_events",
//       "type": "User",
//       "site_admin": false
//     }
//   };