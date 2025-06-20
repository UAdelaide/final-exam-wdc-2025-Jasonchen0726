const { createApp }= Vue;


createApp({
    data(){
        return{
            dogImage:''
        };
    },
    methods(){
        async getImage(){
            try{
                const res=await fetch('https://dog.ceo/api/breeds/image/random');
                const data=await res.json();
                this dogImage=data.message;
            }
        }
    }
})