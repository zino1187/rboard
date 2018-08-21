var http=require("http");
var express=require("express");
var bodyParser=require("body-parser");
var mysql=require("mysql");

var app=express();
var server=http.createServer(app);

//세팅 
app.use(express.static(__dirname+"/views"));
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
app.set("view engine", "ejs");

var pool=mysql.createPool({
	host:"localhost",
	database:"cocat",
	user:"root",
	password:""
});


//글쓰기 요청 처리 
app.post("/board/regist", function(request, response){
	console.log(request.body);
	var writer=request.body.writer;
	var title=request.body.title;
	var content=request.body.content;

	pool.getConnection(function(error, con){
		con.beginTransaction(function(err){
			var sql="insert into rboard(writer,title,content) values(?,?,?)";
			con.query(sql ,[writer, title, content], function(e1, result1){
				if(e1){
					console.log("입력실패", e1);
				}else{
					sql="select last_insert_id() as id";
					con.query(sql, function(e2, result2, fields2){
						var id=result2[0].id;
						console.log("입력된 아이디는 ",result2[0].id);
						sql="update rboard set team=? where rboard_id=?";
						con.query(sql,[id,id], function(e3, result3){
							if(e3){
								console.log("team 업데이트 실패, 트랜잭션 롤백대상임",e3);
								con.rollback(function(e4){
									if(e4){
										console.log("롤백실패");
									}else{
										console.log("롤백완료");
									};
								});
							}else{
								con.commit(function(e5){
									if(e5){
										console.log("커밋실패");
									}else{
										console.log("커밋완료");
										response.writeHead(200,{"Content-Type":"text/html;charset=utf-8"});
										response.end("<script>alert('등록완료');location.href='/board/list'</script>");
									};
								});
							}
						});

					});
				}
				con.release();
			});
			
		});
	});
});


//리스트 요청 처리 
app.get("/board/list", function(request, response){
	pool.getConnection(function(error, con){
		if(error){
			console.log(error);
		}else{
			var sql="select rboard_id,writer,title,content,date_format(regdate, '%Y-%m-%d') as regdate,hit,team,rank,depth from rboard order by team desc, rank asc";
			con.query(sql, function(err1, result1, fields1){
				if(err1){
					console.log("조회 쿼리 실패", err1);
				}else{
					response.render("board/list", {
						rows:result1
					});
				}
				con.release();
			});
		}
	});		
});

// 상세보기 요청 처리 
app.get("/board/content", function(request, response){
	var rboard_id=request.query.rboard_id;

	pool.getConnection(function(error, con){
		if(error){
			console.log(error);
		}else{
			var sql="select * from rboard where rboard_id=?";
			con.query(sql,[rboard_id], function(err, result, fields){
				if(err){
					console.log(err,"조회 실패");
				}else{
					response.render("board/content", {
						row:result[0]
					});
				}
				con.release();
			});
		}
	});
});

//답변폼 요청 처리 
app.post("/board/replyForm", function(request, response){
	response.render("board/reply", {
		row:request.body
	});
});


//답변요청 처리 
app.post("/board/reply", function(request, response){
	var writer=request.body.writer;
	var title=request.body.title;
	var content=request.body.content;
	var team=request.body.team;
	var rank=request.body.rank;
	var depth=request.body.depth;

	pool.getConnection(function(error, con){
		if(error){
			console.log(error);
		}else{
			con.beginTransaction(function(err){
				if(err){
					console.log(err);
				}else{
					var sql="update rboard set rank=rank+1 where team=? and rank > ?";
					con.query(sql, [ team, rank], function(e1, result1){
						if(e1){
							console.log(e1);
							con.release();
						}else{
							sql="insert into rboard(writer,title,content,team,rank,depth) values(?,?,?,?,?,?)";		

							con.query(sql,[writer,title,content,team, rank+1, depth+1], function(e2, result2){
								if(e2){
									console.log(e2,"답변실패이므로 트랜잭션 롤백해야함");
									con.rollback(function(e3){
										if(e3){
											console.log(e3,"롤백실패");
										}else{
											consoe.log("롤백성공");
										}
									});
									con.release();
								}else{
									con.commit(function(e4){
										if(e4){
											console.log("커밋실패", e4);
										}else{
											console.log("커밋성공");
											response.writeHead(200,{"Content-Type":"text/html;charset=utf-8"});
											response.end("<script>alert('답변 등록완료');location.href='/board/list';</script>");
										}
									});								
									con.release();
								}		
							});
						}					
					});						
				}
			});
		}
	});

});


server.listen(8888, function(){
	console.log("웹서버가 8888포트에서 실행중...");
});

