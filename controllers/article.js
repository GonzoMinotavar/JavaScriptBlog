const Article = require('mongoose').model('Article');

function validateArticle(articleParts,req) {
    let errorMsg = '';
    if (!req.isAuthenticated()){
        errorMsg = 'Sorry, you must be logged in!';
    }else if (!articleParts.title){
        errorMsg = 'Title is required!';
    }else if (!articleParts.content) {
        errorMsg = 'Content is required!';
    }
    return errorMsg;
}

module.exports = {
    createGet: (req, res) => {
        res.render('article/create');
    },
    createPost: (req, res) => {
        let articleParts = req.body;

        let errorMsg = validateArticle(articleParts, req);

        if (errorMsg){
            res.render('article/create', {error: errorMsg});
            return;
        }

        let userId = req.user.id;
        articleParts.author = userId;
        Article.create(articleParts).then(article => {
            req.user.articles.push(article.id);
            req.user.save(err => {
                if (err){
                    res.render('article/create',{error: err.message})
                }else {
                    res.redirect('/')
                }
            })
        });
    },

    detailsGet:(req, res) => {
        let id = req.params.id;
        Article.findById(id).populate('author').then(article => {
            if(!req.user){
                res.render('article/details', { article: article, isUserAuthorized: false});
                return;
            }

            req.user.isInRole('Admin').then(isAdmin => {
                let isUserAuthorized = isAdmin || req.user.isAuthor(article);

                res.render('article/details', {article: article, isUserAuthorized: isUserAuthorized});
            });
        });
    },

    editGet: (req, res) => {
        let id = req.params.id;

        if(!req.isAuthenticated()){
            let returnUrl = `/article/edit/${id}`;
            req.session.returnUrl = returnUrl;

            res.redirect('/user/login');
            return;
        }

        Article.findById(id).then(article => {
            req.user.isInRole('Admin').then(isAdmin => {
                if(!isAdmin && !req.user.isAuthor(article)){
                    res.redirect('/');
                    return;
                }
                res.render('article/edit', article)
            });
        });

    },
    editPost: (req, res) => {
        let id = req.params.id;

        let articleParts = req.body;

        let errorMsg = validateArticle(articleParts, req);

        if(errorMsg){
            res.render('article/edit',{ error: errorMsg });
            return;
        }

        Article.update({_id: id}, {$set: {title: articleParts.title, content: articleParts.content}}).then(err => {
            res.redirect(`/article/details/${id}`);
        })
    },
    deleteGet: (req, res) => {
    let id = req.params.id;


    if(!req.isAuthenticated()){
        let returnUrl = `/article/delete/${id}`;
        req.session.returnUrl = returnUrl;

        res.redirect('/user/login');
        return;
    }

    Article.findById(id).then(article => {
       req.user.isInRole('Admin').then(isAdmin => {
           if(!isAdmin && !req.user.isAuthor(article)){
               res.redirect('/');
               return;
           }
           res.render('article/delete', article)
       });
    });

    },
    deletePost: (req, res) => {
        let id = req.params.id;

        Article.findByIdAndRemove(id).then(article => {
            let index = req.user.articles.indexOf(article.id);
            req.user.articles.splice(index, 1);
            req.user.save(err => {
                if (err) {
                    res.redirect('/', { error: err.message })
                } else {
                    res.redirect('/')
                }
            })
        });
    }
};